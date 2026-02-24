# RDMA FPGA Zero‑Copy Receiver

This program demonstrates production‑quality reception of network packets directly into FPGA memory using InfiniBand RDMA. It was rebuilt from an AI‑generated snippet that contained critical flaws (undefined variables, missing error handling, incomplete state machine). The version you see here is **ready for real‑world use**.

## What It Does

- Maps an FPGA BAR (Base Address Register) into userspace memory.
- Registers that memory with the InfiniBand verbs library for remote write access.
- Configures an InfiniBand Queue Pair (QP) to the **Ready to Receive (RTR)** state.
- Posts a receive buffer so incoming RDMA writes land directly in FPGA memory.
- Polls the completion queue, prints packet details, and reposts the buffer.
- Handles all errors, cleans up resources, and validates configuration.

## Requirements

### Hardware
- An FPGA with a PCIe BAR that can be mapped from userspace.
- An InfiniBand adapter (e.g., Mellanox ConnectX‑5) with RDMA support.
- Both devices properly installed and driver‑loaded.

### Software
- Linux OS with InfiniBand drivers (MLNX_OFED or upstream).
- `libibverbs` development libraries.
- GCC or compatible C compiler.

## Compilation

```bash
gcc -o rdma_fpga rdma_fpga.c -libverbs
```

Configuration (Environment Variables)

All settings are passed via environment variables – no hardcoded values.

Variable Description Default Required
FPGA_DEV Path to FPGA device file /dev/fpga0 No
FPGA_BAR_SIZE Size of the FPGA BAR (bytes, hex or decimal) 0x100000 (1MB) No
MAX_PACKET_SIZE Maximum expected packet size (bytes) 2048 No
IB_DEV InfiniBand device name (e.g., mlx5_0) mlx5_0 No
IB_PORT InfiniBand port number 1 No
REMOTE_QPN Remote Queue Pair Number (from peer) – Yes
REMOTE_LID Remote LID (from peer) – Yes
REMOTE_PSN Remote Packet Sequence Number (optional) 0 No

Note: REMOTE_QPN and REMOTE_LID must be obtained out‑of‑band (e.g., via a separate control channel). They identify the remote QP that will send data to this receiver.

Usage Example

1. On the receiver node (this program):
   ```bash
   export FPGA_DEV=/dev/fpga0
   export FPGA_BAR_SIZE=0x100000
   export MAX_PACKET_SIZE=2048
   export IB_DEV=mlx5_0
   export IB_PORT=1
   export REMOTE_QPN=42
   export REMOTE_LID=16
   ./rdma_fpga
   ```
   The program will wait for packets and print details when they arrive.
2. On the sender node (using, e.g., ib_send_bw or a custom RDMA writer):
   Ensure the sender is configured to write to the receiver’s memory (the receiver’s physical address is not needed – RDMA uses QP numbers and virtual addresses registered with the NIC).

What Was Fixed from the AI Original

· All missing variables (fpga_fd, pd, qp, bad_wr, constants) are now defined.
· Error checking on every system call – no silent failures.
· Resource cleanup on any error path (no leaks).
· Full QP state machine: RESET → INIT → RTR.
· Device discovery – verifies the InfiniBand device exists.
· Size validation – ensures packet size fits BAR.
· Configuration via environment – no hardcoded placeholders.
· Completion queue polling – actually waits for packets.
· Buffer reposting – ready for multiple packets.
· Documentation and usage instructions.

Limitations / Future Improvements

· Only a single receive buffer is posted; for high‑throughput, extend to a ring of buffers.
· The program runs forever (until interrupted). Add a signal handler for graceful shutdown.
· Endianness is assumed to match the wire; add byte‑swapping if needed.
· No RTS transition is performed because this receiver only listens; add if you need to send.

License

This code is provided as‑is for demonstration purposes. Modify and use at your own risk.

```