# AI to Production

**I take code that AI generates and make it actually work in production.**

AI is great at first drafts. Terrible at error handling, edge cases, security, and the 90% of work that makes code reliable.

This repo shows real examples of AI-generated code vs. production-ready versions I've fixed.

## Why This Exists

Companies use AI to move faster. Then they discover the code:
- Has no error handling
- Fails silently
- Ignores security
- Can't handle real-world inputs
- Breaks at 3 AM

I fix that.

## Examples

| Example | Domain | Description |
|---------|--------|-------------|
| [01-backup-script](./examples/01-backup-script) | Bash | A simple backup script that looks fine but loses data |
| [02-rdma-fpga](./examples/02-rdma-fpga) | C/InfiniBand | RDMA/FPGA zero-copy packet receiver for high-frequency trading |
| [03-arb-detector](./examples/03-arb-detector) | Verilog | FPGA arbitrage detector that compares exchange prices at 1GHz |
| [04-kernel-bypass](./examples/04-kernel-bypass) | C/InfiniBand | Complete kernel bypass implementation with RDMA |

## What Each Example Shows

Every example includes:

### 🔍 The AI Version
What most people get when they ask AI for help. Looks plausible. Doesn't work.

### ✅ The Production Version
Complete, working code with:
- Full error handling
- Validation at every step
- Proper cleanup
- Documentation
- Installation guides
- Verification procedures
- Troubleshooting

### 📊 The Analysis
A forensic breakdown of what AI missed and why it matters.

## Detailed Example Breakdown

### 01-backup-script (Bash)
**AI Version:** A 5-line backup script with no error checking
**Production Version:** 150+ lines with:
- Argument validation
- Path existence and permission checks
- Disk space verification
- Timestamped archives
- Safe filename handling (no overwrites)
- Verification of successful operation

### 02-rdma-fpga (C/InfiniBand)
**AI Version:** Snippet with missing variables, no error handling, incomplete QP state machine
**Production Version:** Complete implementation with:
- Full RDMA setup (protection domain, queue pair, memory registration)
- Comprehensive error handling for every system call
- Environment-based configuration
- Endianness awareness
- Proper resource cleanup
- Completion queue polling

### 03-arb-detector (Verilog)
**AI Version:** 30-line module with no reset, stale data handling, truncated output
**Production Version:** Production-grade FPGA design with:
- Synchronous reset for proper initialization
- Both-valid latching to prevent stale comparisons
- Full 64-bit precision output
- Parameterized threshold for compile-time configuration
- Fixed-point format documentation
- Input synchronization guidance

### 04-kernel-bypass (C/InfiniBand)
**AI Version:** Incomplete RDMA snippet with undefined variables
**Production Version:** Complete zero-copy implementation with:
- Full QP state machine (RESET → INIT → RTR)
- Device discovery and validation
- Environment variable configuration
- Buffer reposting after each receive
- Size validation
- Graceful failure handling
- Complete documentation and usage examples

## The Pattern

Across all examples, the pattern is consistent:

| What AI Misses | Why It Matters |
|----------------|----------------|
| Error handling | Code crashes silently, no debugging info |
| Resource cleanup | Memory leaks, crashes after running |
| Input validation | Garbage in = garbage out (or crash) |
| State machines | Operations in wrong order = failure |
| Edge cases | Works 99% of time, fails at 3 AM |
| Documentation | No one knows how to use or maintain it |

## Hire Me

Companies hire me to:
- Audit AI-generated code before it hits production
- Fix existing AI code that's causing problems
- Train teams to spot AI's blind spots
- Build robust systems that stay up

[LinkedIn](https://linkedin.com/in/brooksjoey11) | [Email](mailto:your-email@example.com) | [GitHub](https://github.com/brooksjoey11)