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
| [02-rdma-fpga](./examples/02-rdma-fpga) | C/InfiniBand | High-frequency trading packet receiver that would crash instantly |

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

## Hire Me

Companies hire me to:
- Audit AI-generated code before it hits production
- Fix existing AI code that's causing problems
- Train teams to spot AI's blind spots

[LinkedIn] | [Email] | [GitHub]