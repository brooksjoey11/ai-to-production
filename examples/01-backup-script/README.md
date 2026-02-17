# Backup Script: AI vs Production

## The AI Version (5 lines)

The AI generated this in seconds. Looks reasonable. Doesn't work.

**Problems:**
- No check if arguments exist
- No check if source is readable
- No check if destination is writable  
- Paths with spaces break it
- No timestamp (can't tell backups apart)
- Overwrites existing backups silently
- Says "Backup complete!" even when tar fails
- No verification backup actually exists

## The Production Version (200+ lines)

Fixed version adds:
- Full argument validation
- Path existence and permission checks
- Proper quoting for paths with spaces
- Timestamped filenames
- Conflict resolution (no overwrites)
- Error checking on every operation
- Verification after each step
- Disk space checking
- Cleanup on failure
- Meaningful error messages
- Success verification

## The Result

AI version: Silent data loss waiting to happen
Production version: Actually reliable
