# RDMA/FPGA Zero-Copy Receive: AI vs Production

## The AI Version

The AI generated a snippet that references all the right InfiniBand verbs functions. It looks plausible. It would crash instantly.

**What's missing:**
- All variable definitions (fpga_fd, pd, qp, mr, etc.)
- QP state machine (RESET → INIT → RTR)
- Device discovery and validation
- Error handling on 12+ system calls
- Resource cleanup (memory leaks guaranteed)
- Environment configuration (hardcoded placeholders)
- Completion queue polling
- Buffer reposting
- Path MTU configuration
- Remote side information exchange
- 20+ other critical details

## The Production Version

The fixed version adds:
- Full QP state machine implementation
- Device discovery with fallback
- Error handling on every operation
- Proper resource cleanup on all paths
- Environment variable configuration
- Completion queue polling loop
- Buffer reposting after each receive
- Size validation
- Endianness documentation
- Graceful failure handling

## Who Needs This

This level of optimization is overkill for 99% of applications. You only need it if:
- You're processing market data at microsecond latency
- You're building network equipment
- You're working with FPGA acceleration
- You have a budget for specialized hardware

## The Result

AI version: Looks impressive, does nothing
Production version: Actually receives packets at hardware speed
