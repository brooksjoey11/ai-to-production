/**
 * Corrected RDMA FPGA Receive Setup
 * 
 * This program demonstrates zero-copy reception of network packets directly into
 * FPGA memory using InfiniBand RDMA. It addresses all issues identified in the
 * forensic dossier:
 * - All missing variables defined and initialized
 * - Comprehensive error handling for every system call
 * - Proper resource cleanup
 * - Configuration via environment variables (no hardcoded placeholders)
 * - Unique work request IDs
 * - Endianness considerations documented
 * 
 * Compilation:
 *   gcc -o rdma_fpga_recv rdma_fpga_recv.c -libverbs
 * 
 * Usage (environment variables):
 *   export FPGA_DEV="/dev/fpga0"                # FPGA device file
 *   export FPGA_BAR_SIZE=0x100000                # Size of FPGA BAR (e.g., 1MB)
 *   export MAX_PACKET_SIZE=2048                  # Maximum expected packet size
 *   export IB_DEV="mlx5_0"                        # InfiniBand device name
 *   export IB_PORT=1                              # InfiniBand port number
 *   export REMOTE_QPN=42                           # Remote queue pair number
 *   export REMOTE_LID=16                           # Remote LID
 *   export REMOTE_PSN=0x123456                     # Remote packet sequence number (optional)
 * 
 * Note: The program assumes an RC queue pair and that the remote side is already
 *       set up to send packets to this node. Modify the QP attributes as needed.
 */

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/mman.h>
#include <infiniband/verbs.h>

/*---------------------------------------------------------------------------*/
/* Packet format (must match wire protocol)                                  */
/*---------------------------------------------------------------------------*/
struct hft_packet {
    uint64_t timestamp;      // hardware timestamp (nanoseconds)
    uint32_t exchange_id;    
    uint64_t price;          // fixed-point price (scale defined by protocol)
    uint32_t volume;
} __attribute__((packed));

/* Note: The packet format assumes the network byte order matches the host.
 * If not, you must swap bytes after reception using e.g., ntoh* functions.
 */

/*---------------------------------------------------------------------------*/
/* Helper: print error and exit                                              */
/*---------------------------------------------------------------------------*/
static void fatal(const char *msg) {
    perror(msg);
    exit(EXIT_FAILURE);
}

/*---------------------------------------------------------------------------*/
/* Main program                                                              */
/*---------------------------------------------------------------------------*/
int main(int argc, char *argv[]) {
    /*---------------------------------------------------------------------------*/
    /* 1. Read configuration from environment                                   */
    /*---------------------------------------------------------------------------*/
    const char *fpga_dev_path = getenv("FPGA_DEV");
    if (!fpga_dev_path) fpga_dev_path = "/dev/fpga0";

    const char *bar_size_str = getenv("FPGA_BAR_SIZE");
    size_t fpga_bar_size = bar_size_str ? strtoul(bar_size_str, NULL, 0) : 0x100000; // 1MB default

    const char *max_pkt_str = getenv("MAX_PACKET_SIZE");
    size_t max_packet_size = max_pkt_str ? strtoul(max_pkt_str, NULL, 0) : 2048;

    const char *ib_dev_name = getenv("IB_DEV");
    if (!ib_dev_name) ib_dev_name = "mlx5_0";

    const char *ib_port_str = getenv("IB_PORT");
    int ib_port = ib_port_str ? atoi(ib_port_str) : 1;

    const char *remote_qpn_str = getenv("REMOTE_QPN");
    if (!remote_qpn_str) fatal("REMOTE_QPN environment variable not set");
    uint32_t remote_qpn = strtoul(remote_qpn_str, NULL, 0);

    const char *remote_lid_str = getenv("REMOTE_LID");
    if (!remote_lid_str) fatal("REMOTE_LID environment variable not set");
    uint16_t remote_lid = strtoul(remote_lid_str, NULL, 0);

    const char *remote_psn_str = getenv("REMOTE_PSN");
    uint32_t remote_psn = remote_psn_str ? strtoul(remote_psn_str, NULL, 0) : 0;

    /* Validate size */
    if (max_packet_size > fpga_bar_size) {
        fprintf(stderr, "ERROR: MAX_PACKET_SIZE (%zu) > FPGA_BAR_SIZE (%zu)\n",
                max_packet_size, fpga_bar_size);
        exit(EXIT_FAILURE);
    }

    /*---------------------------------------------------------------------------*/
    /* 2. Open FPGA device and map BAR into userspace                           */
    /*---------------------------------------------------------------------------*/
    int fpga_fd = open(fpga_dev_path, O_RDWR);
    if (fpga_fd < 0) fatal("open FPGA device");

    void *fpga_mem = mmap(NULL, fpga_bar_size, PROT_READ | PROT_WRITE,
                          MAP_SHARED, fpga_fd, 0);
    if (fpga_mem == MAP_FAILED) {
        close(fpga_fd);
        fatal("mmap FPGA BAR");
    }

    /*---------------------------------------------------------------------------*/
    /* 3. Initialize InfiniBand resources                                       */
    /*---------------------------------------------------------------------------*/
    struct ibv_device **dev_list;
    struct ibv_context *ctx;
    struct ibv_pd *pd;
    struct ibv_cq *cq;
    struct ibv_qp *qp;
    struct ibv_mr *mr;
    struct ibv_qp_init_attr qp_init_attr;
    struct ibv_qp_attr qp_attr;
    int ret;

    /* Get device list */
    dev_list = ibv_get_device_list(NULL);
    if (!dev_list) fatal("ibv_get_device_list");

    /* Find the requested device */
    struct ibv_device *ib_dev = NULL;
    for (int i = 0; dev_list[i]; ++i) {
        if (strcmp(ibv_get_device_name(dev_list[i]), ib_dev_name) == 0) {
            ib_dev = dev_list[i];
            break;
        }
    }
    if (!ib_dev) {
        fprintf(stderr, "ERROR: InfiniBand device '%s' not found\n", ib_dev_name);
        ibv_free_device_list(dev_list);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        exit(EXIT_FAILURE);
    }

    /* Open device */
    ctx = ibv_open_device(ib_dev);
    ibv_free_device_list(dev_list); // free list after use
    if (!ctx) {
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        fatal("ibv_open_device");
    }

    /* Allocate protection domain */
    pd = ibv_alloc_pd(ctx);
    if (!pd) {
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        fatal("ibv_alloc_pd");
    }

    /* Create completion queue */
    cq = ibv_create_cq(ctx, 100, NULL, NULL, 0); // 100 entries, no completion channel
    if (!cq) {
        ibv_dealloc_pd(pd);
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        fatal("ibv_create_cq");
    }

    /* Create queue pair (RC) */
    memset(&qp_init_attr, 0, sizeof(qp_init_attr));
    qp_init_attr.send_cq = cq;
    qp_init_attr.recv_cq = cq;
    qp_init_attr.cap.max_send_wr = 1;
    qp_init_attr.cap.max_recv_wr = 1;
    qp_init_attr.cap.max_send_sge = 1;
    qp_init_attr.cap.max_recv_sge = 1;
    qp_init_attr.qp_type = IBV_QPT_RC;

    qp = ibv_create_qp(pd, &qp_init_attr);
    if (!qp) {
        ibv_destroy_cq(cq);
        ibv_dealloc_pd(pd);
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        fatal("ibv_create_qp");
    }

    /*---------------------------------------------------------------------------*/
    /* 4. Move QP from RESET to INIT                                            */
    /*---------------------------------------------------------------------------*/
    memset(&qp_attr, 0, sizeof(qp_attr));
    qp_attr.qp_state        = IBV_QPS_INIT;
    qp_attr.pkey_index      = 0;
    qp_attr.port_num        = ib_port;
    qp_attr.qp_access_flags = IBV_ACCESS_REMOTE_WRITE | IBV_ACCESS_LOCAL_WRITE;

    ret = ibv_modify_qp(qp, &qp_attr,
                        IBV_QP_STATE | IBV_QP_PKEY_INDEX | IBV_QP_PORT | IBV_QP_ACCESS_FLAGS);
    if (ret) {
        fprintf(stderr, "ibv_modify_qp to INIT failed: %d\n", ret);
        ibv_destroy_qp(qp);
        ibv_destroy_cq(cq);
        ibv_dealloc_pd(pd);
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        exit(EXIT_FAILURE);
    }

    /*---------------------------------------------------------------------------*/
    /* 5. Move QP from INIT to RTR (Ready to Receive)                           */
    /*    Requires remote side information (obtained via out-of-band exchange)  */
    /*---------------------------------------------------------------------------*/
    memset(&qp_attr, 0, sizeof(qp_attr));
    qp_attr.qp_state            = IBV_QPS_RTR;
    qp_attr.path_mtu            = IBV_MTU_4096;   // adjust as needed
    qp_attr.dest_qp_num         = remote_qpn;
    qp_attr.rq_psn              = remote_psn;
    qp_attr.max_dest_rd_atomic  = 1;
    qp_attr.min_rnr_timer       = 12;
    qp_attr.ah_attr.is_global   = 0;
    qp_attr.ah_attr.dlid        = remote_lid;
    qp_attr.ah_attr.sl          = 0;
    qp_attr.ah_attr.src_path_bits = 0;
    qp_attr.ah_attr.port_num    = ib_port;

    ret = ibv_modify_qp(qp, &qp_attr,
                        IBV_QP_STATE | IBV_QP_PATH_MTU | IBV_QP_DEST_QPN |
                        IBV_QP_RQ_PSN | IBV_QP_MAX_DEST_RD_ATOMIC |
                        IBV_QP_MIN_RNR_TIMER | IBV_QP_AV);
    if (ret) {
        fprintf(stderr, "ibv_modify_qp to RTR failed: %d\n", ret);
        ibv_destroy_qp(qp);
        ibv_destroy_cq(cq);
        ibv_dealloc_pd(pd);
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        exit(EXIT_FAILURE);
    }

    /* (Optional) Move QP to RTS if you plan to send – not needed for receive only */

    /*---------------------------------------------------------------------------*/
    /* 6. Register FPGA memory with InfiniBand                                  */
    /*---------------------------------------------------------------------------*/
    mr = ibv_reg_mr(pd, fpga_mem, fpga_bar_size,
                    IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_WRITE);
    if (!mr) {
        ibv_destroy_qp(qp);
        ibv_destroy_cq(cq);
        ibv_dealloc_pd(pd);
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        fatal("ibv_reg_mr");
    }

    /*---------------------------------------------------------------------------*/
    /* 7. Post receive buffer                                                    */
    /*---------------------------------------------------------------------------*/
    struct ibv_sge sge;
    struct ibv_recv_wr wr, *bad_wr = NULL;

    sge.addr   = (uint64_t)fpga_mem;
    sge.length = max_packet_size;
    sge.lkey   = mr->lkey;

    memset(&wr, 0, sizeof(wr));
    wr.wr_id   = 1;          // unique ID for this WR; could be incremented for multiple buffers
    wr.sg_list = &sge;
    wr.num_sge = 1;

    ret = ibv_post_recv(qp, &wr, &bad_wr);
    if (ret) {
        fprintf(stderr, "ibv_post_recv failed, ret=%d, bad_wr=%p\n", ret, (void*)bad_wr);
        ibv_dereg_mr(mr);
        ibv_destroy_qp(qp);
        ibv_destroy_cq(cq);
        ibv_dealloc_pd(pd);
        ibv_close_device(ctx);
        munmap(fpga_mem, fpga_bar_size);
        close(fpga_fd);
        exit(EXIT_FAILURE);
    }

    printf("Receive buffer posted successfully.\n");
    printf("Waiting for packets... (polling CQ, press Ctrl+C to stop)\n");

    /*---------------------------------------------------------------------------*/
    /* 8. Poll completion queue to see when packets arrive                      */
    /*---------------------------------------------------------------------------*/
    struct ibv_wc wc;
    while (1) {
        int ne = ibv_poll_cq(cq, 1, &wc);
        if (ne < 0) {
            perror("ibv_poll_cq");
            break;
        }
        if (ne == 0) {
            usleep(1000); // 1 ms sleep to avoid busy loop
            continue;
        }

        if (wc.status != IBV_WC_SUCCESS) {
            fprintf(stderr, "Work completion error: %s\n",
                    ibv_wc_status_str(wc.status));
            break;
        }

        if (wc.opcode & IBV_WC_RECV) {
            printf("Packet received, length %u bytes\n", wc.byte_len);
            /* Here you would cast fpga_mem to struct hft_packet* and process,
             * taking care of endianness if necessary.
             */
            struct hft_packet *pkt = (struct hft_packet*)fpga_mem;
            printf("  timestamp: %lu\n", pkt->timestamp);
            printf("  exchange_id: %u\n", pkt->exchange_id);
            printf("  price: %lu\n", pkt->price);
            printf("  volume: %u\n", pkt->volume);

            /* Repost the same buffer for further receives */
            ret = ibv_post_recv(qp, &wr, &bad_wr);
            if (ret) {
                fprintf(stderr, "ibv_post_recv repost failed, ret=%d\n", ret);
                break;
            }
        }
    }

    /*---------------------------------------------------------------------------*/
    /* 9. Cleanup (normally not reached because of infinite loop)               */
    /*---------------------------------------------------------------------------*/
    ibv_dereg_mr(mr);
    ibv_destroy_qp(qp);
    ibv_destroy_cq(cq);
    ibv_dealloc_pd(pd);
    ibv_close_device(ctx);
    munmap(fpga_mem, fpga_bar_size);
    close(fpga_fd);

    return 0;
}
