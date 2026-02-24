#!/bin/bash
# Sync script with error handling, configurable paths, and lock file

set -euo pipefail

# Configuration with environment variable overrides
: "${PRIMARY_DIR:=/data/primary}"
: "${BACKUP_DIR:=/data/backup}"
: "${INCOMING_DIR:=/data/incoming}"
: "${PROCESSED_DIR:=/data/processed}"
: "${FAILED_DIR:=/data/failed}"
: "${LOG_FILE:=/var/log/sync.log}"
: "${PROCESS_SCRIPT:=/usr/local/bin/process_file.py}"
: "${REPORT_SCRIPT:=/usr/local/bin/generate-report.sh}"
: "${LOCK_FILE:=/var/run/sync-data.lock}"
: "${LOG_MAX_SIZE:=10485760}"  # 10MB
: "${LOG_RETENTION:=5}"         # number of rotated logs to keep

# Ensure required directories exist
mkdir -p "$PRIMARY_DIR" "$BACKUP_DIR" "$INCOMING_DIR" "$PROCESSED_DIR" "$FAILED_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$LOCK_FILE")"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Error handling: log and exit
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check if required external scripts exist and are executable
check_script() {
    if [ ! -x "$1" ]; then
        error_exit "Required script $1 not found or not executable"
    fi
}
check_script "$PROCESS_SCRIPT"
check_script "$REPORT_SCRIPT"

# Log rotation: if log file exceeds max size, rotate
rotate_log() {
    if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt "$LOG_MAX_SIZE" ]; then
        local i
        for ((i=LOG_RETENTION-1; i>=1; i--)); do
            if [ -f "${LOG_FILE}.$i" ]; then
                mv "${LOG_FILE}.$i" "${LOG_FILE}.$((i+1))"
            fi
        done
        mv "$LOG_FILE" "${LOG_FILE}.1"
        touch "$LOG_FILE"
        log "Log rotated"
    fi
}

# Acquire lock using flock (if available) or fallback to mkdir
lock_acquired=0
if command -v flock >/dev/null 2>&1; then
    exec 200>"$LOCK_FILE"
    if ! flock -n 200; then
        log "Another instance is running, exiting"
        exit 0
    fi
    lock_acquired=1
else
    # Fallback: use mkdir as a simple lock
    if ! mkdir "$LOCK_FILE.lock" 2>/dev/null; then
        log "Another instance is running, exiting"
        exit 0
    fi
    trap 'rmdir "$LOCK_FILE.lock"' EXIT
fi

# Start sync
rotate_log
log "Starting sync"

# Sync data with error check
if rsync -avz "$PRIMARY_DIR/" "$BACKUP_DIR/"; then
    log "rsync completed successfully"
else
    error_exit "rsync failed"
fi

# Process incoming files safely
# Use find to handle spaces and special chars, and only regular files
# Also skip files modified in the last 60 seconds to avoid partial writes
find "$INCOMING_DIR" -maxdepth 1 -type f -mmin +1 -print0 | while IFS= read -r -d '' file; do
    # Ignore hidden files
    if [[ "$(basename "$file")" == .* ]]; then
        log "Skipping hidden file: $file"
        continue
    fi
    log "Processing $file"
    if "$PROCESS_SCRIPT" "$file"; then
        mv "$file" "$PROCESSED_DIR/"
        log "Successfully processed and moved $file to $PROCESSED_DIR"
    else
        # Move to failed directory with timestamp to avoid name clashes
        failed_file="$FAILED_DIR/$(basename "$file").$(date +%Y%m%d-%H%M%S).failed"
        mv "$file" "$failed_file"
        log "ERROR: Failed to process $file, moved to $failed_file"
    fi
done

# Generate report
if "$REPORT_SCRIPT"; then
    log "Report generated successfully"
else
    log "ERROR: Report generation failed"
    # Not exiting because report may be non-critical
fi

log "Sync complete"

# Release lock if using flock
if [ "$lock_acquired" -eq 1 ]; then
    flock -u 200
fi

exit 0