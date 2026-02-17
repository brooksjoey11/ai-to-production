# AI to Production

**I take code that AI generates and make it actually work in production.**

AI is great at first drafts. Terrible at error handling, edge cases, security, and the 90% of work that makes code reliable.

This repo shows real examples of AI-generated code vs. production-ready versions I've fixed.

## Examples

| Example | Domain | Skill Level | What AI Missed |
|---------|--------|-------------|----------------|
| [01-backup-script](./examples/01-backup-script) | Bash | Entry-level | Argument validation, error handling, path safety, disk space checks |

## What's Inside Each Example

Every example includes:

### 🔍 The AI Version
The original AI-generated code—what most people get when they ask AI for help.

### ⚠️ What AI Missed
A forensic breakdown of every hidden issue:
- Missing error handling
- Silent failures
- Security holes
- Edge cases
- Resource leaks

### ✅ The Production Version
Complete, working code with:
- Full error handling
- Validation at every step
- Proper cleanup
- Documentation
- Installation instructions
- Usage examples
- Verification procedures
- Troubleshooting guides

### 📊 The Analysis
What improved, critical fixes, hidden risks, and why it matters.

## Why This Exists

Companies use AI to move faster. Then they discover the code:
- Has no error handling
- Fails silently
- Ignores security
- Can't handle real-world inputs
- Breaks at 3 AM

I fix that.

## Hire Me

Companies hire me to:
- Audit AI-generated code before it hits production
- Fix existing AI code that's causing problems
- Train teams to spot AI's blind spots

[LinkedIn] | [Email] | [GitHub]
