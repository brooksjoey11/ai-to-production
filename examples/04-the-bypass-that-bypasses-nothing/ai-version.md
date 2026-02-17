// Simplified RDMA (Remote Direct Memory Access) setup
// Bypasses entire network stack, writes exchange packets directly to FPGA memory

#include <infiniband/verbs.h>

struct hft_packet {
    uint64_t timestamp;      // hardware timestamp (nanoseconds)
    uint32_t exchange_id;    
    uint64_t price;          // fixed-point price
    uint32_t volume;
} __attribute__((packed));

// Map FPGA memory into userspace
void* fpga_mem = mmap(
    NULL, 
    FPGA_BAR_SIZE, 
    PROT_READ | PROT_WRITE, 
    MAP_SHARED, 
    fpga_fd, 
    0
);

// Set up zero-copy receive
struct ibv_mr* mr = ibv_reg_mr(
    pd,
    fpga_mem,                    // write directly to FPGA memory
    FPGA_BAR_SIZE,
    IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_WRITE
);

// Post receive buffer (reused, never copied)
struct ibv_recv_wr wr = {
    .wr_id = 1,
    .sg_list = &(struct ibv_sge){
        .addr = (uint64_t)fpga_mem,
        .length = MAX_PACKET_SIZE,
        .lkey = mr->lkey
    },
    .num_sge = 1
};

ibv_post_recv(qp, &wr, &bad_wr);
// When packet arrives, DMA engine writes directly to FPGA
// CPU never touches the packet until FPGA signals