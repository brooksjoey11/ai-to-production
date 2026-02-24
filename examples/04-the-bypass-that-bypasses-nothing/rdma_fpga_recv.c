#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <infiniband/verbs.h>

/* Configuration – adjust to your hardware */
#define FPGA_DEVICE_PATH   "/dev/fpga"      /* Path to FPGA character device */
#define FPGA_BAR_SIZE       (1UL << 20)      /* 1 MB – size of FPGA memory BAR */
#define MAX_PACKET_SIZE     2048             /* Must be ≤ FPGA_BAR_SIZE */

/* Ensure MAX_PACKET_SIZE fits in the mapped region */
_Static_assert(MAX_PACKET_SIZE <= FPGA_BAR_SIZE,
               "MAX_PACKET_SIZE exceeds FPGA_BAR_SIZE");

struct hft_packet {
    uint64_t timestamp;      /* hardware timestamp (nanoseconds) */
    uint32_t exchange_id;
    uint64_t price;          /* fixed-point price */
    uint32_t volume;
} __attribute__((packed));

int main(void)
{
    int ret = 0;
    int fpga_fd = -1;
    void *fpga_mem = NULL;
    struct ibv_device **dev_list = NULL;
    struct ibv_context *ctx = NULL;
    struct ibv_pd *pd = NULL;
    struct ibv_mr *mr = NULL;
    struct ibv_cq *cq = NULL;
    struct ibv_qp *qp = NULL;
    struct ibv_qp_init_attr qp_init_attr;
    struct ibv_recv_wr wr, *bad_wr = NULL;
    struct ibv_sge sge;   /* named for clarity (optional) */

    /* 1. Open FPGA device */
    fpga_fd = open(FPGA_DEVICE_PATH, O_RDWR);
    if (fpga_fd < 0) {
        fprintf(stderr, "Failed to open FPGA device %s: %s\n",
                FPGA_DEVICE_PATH, strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 2. Map FPGA memory */
    fpga_mem = mmap(NULL, FPGA_BAR_SIZE, PROT_READ | PROT_WRITE,
                    MAP_SHARED, fpga_fd, 0);
    if (fpga_mem == MAP_FAILED) {
        fprintf(stderr, "mmap failed: %s\n", strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 3. Get InfiniBand device list */
    dev_list = ibv_get_device_list(NULL);
    if (!dev_list) {
        fprintf(stderr, "ibv_get_device_list failed (no InfiniBand devices?)\n");
        ret = 1;
        goto cleanup;
    }
    if (!dev_list[0]) {
        fprintf(stderr, "No InfiniBand device found\n");
        ret = 1;
        goto cleanup;
    }

    /* 4. Open first device */
    ctx = ibv_open_device(dev_list[0]);
    if (!ctx) {
        fprintf(stderr, "ibv_open_device failed: %s\n", strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 5. Allocate protection domain */
    pd = ibv_alloc_pd(ctx);
    if (!pd) {
        fprintf(stderr, "ibv_alloc_pd failed: %s\n", strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 6. Register FPGA memory for RDMA */
    mr = ibv_reg_mr(pd, fpga_mem, FPGA_BAR_SIZE,
                    IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_WRITE);
    if (!mr) {
        fprintf(stderr, "ibv_reg_mr failed: %s\n", strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 7. Create completion queue (minimal depth) */
    cq = ibv_create_cq(ctx, 1, NULL, NULL, 0);
    if (!cq) {
        fprintf(stderr, "ibv_create_cq failed: %s\n", strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 8. Create queue pair (RC) */
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
        fprintf(stderr, "ibv_create_qp failed: %s\n", strerror(errno));
        ret = 1;
        goto cleanup;
    }

    /* 9. Prepare receive work request */
    sge.addr   = (uint64_t)fpga_mem;
    sge.length = MAX_PACKET_SIZE;
    sge.lkey   = mr->lkey;

    memset(&wr, 0, sizeof(wr));
    wr.wr_id   = 1;
    wr.sg_list = &sge;
    wr.num_sge = 1;

    /* 10. Post receive buffer */
    if (ibv_post_recv(qp, &wr, &bad_wr)) {
        fprintf(stderr, "ibv_post_recv failed\n");
        ret = 1;
        goto cleanup;
    }

    printf("RDMA receive buffer posted successfully.\n");
    printf("FPGA memory mapped at %p, size %lu, ready for incoming packets.\n",
           fpga_mem, (unsigned long)FPGA_BAR_SIZE);

    /* Normally the program would now wait for packets (e.g., via FPGA interrupt) */
    /* ... application logic ... */

cleanup:
    /* Free resources in reverse order */
    if (qp) ibv_destroy_qp(qp);
    if (cq) ibv_destroy_cq(cq);
    if (mr) ibv_dereg_mr(mr);
    if (pd) ibv_dealloc_pd(pd);
    if (ctx) ibv_close_device(ctx);
    if (dev_list) ibv_free_device_list(dev_list);
    if (fpga_mem && fpga_mem != MAP_FAILED) munmap(fpga_mem, FPGA_BAR_SIZE);
    if (fpga_fd >= 0) close(fpga_fd);

    return ret;
}