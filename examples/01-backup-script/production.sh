#!/bin/bash
#
# Production Backup Script
# Creates timestamped compressed backup of source directory
# Usage: ./backup.sh /source/directory /destination/directory
#
# Version: 1.0
# Last Updated: 2024

set -o pipefail  # Preserve exit codes in pipelines

# -------------------------------
# Configuration
# -------------------------------
SCRIPT_NAME=$(basename "$0")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# -------------------------------
# Function: Show usage
# ----------------------------
show_usage() {
    echo "Usage: $SCRIPT_NAME SOURCE_DIRECTORY DESTINATION_DIRECTORY"
    echo ""
    echo "Arguments:"
    echo "  SOURCE_DIRECTORY      Directory to back up (must exist and be readable)"
    echo "  DESTINATION_DIRECTORY Where to store the backup (must exist and be writable)"
    echo ""
    echo "Example:"
    echo "  $SCRIPT_NAME /home/user/documents /backup/archives"
    exit 1
}

# -------------------------------
# Function: Error handler
# -------------------------------
error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

# -------------------------------
# Step 1: Validate arguments
# -------------------------------
if [ $# -ne 2 ]; then
    echo "ERROR: Exactly two arguments required (received $#)" >&2
    show_usage
fi

SOURCE="$1"
DEST="$2"

# -------------------------------
# Step 2: Validate source
# -------------------------------
if [ ! -e "$SOURCE" ]; then
    error_exit "Source does not exist: $SOURCE"
fi

if [ ! -d "$SOURCE" ]; then
    error_exit "Source is not a directory: $SOURCE"
fi

if [ ! -r "$SOURCE" ]; then
    error_exit "Source directory is not readable: $SOURCE"
fi

# -------------------------------
# Step 3: Validate destination
# -------------------------------
if [ ! -d "$DEST" ]; then
    error_exit "Destination is not a directory or does not exist: $DEST"
fi

if [ ! -w "$DEST" ]; then
    error_exit "Destination directory is not writable: $DEST"
fi

# -------------------------------
# Step 4: Check current directory writability
# -------------------------------
if [ ! -w "." ]; then
    error_exit "Current directory is not writable (needed for temporary archive)"
fi

# -------------------------------
# Step 5: Check available disk space (basic check)
# -------------------------------
SOURCE_SIZE=$(du -s "$SOURCE" 2>/dev/null | cut -f1)
if [ -z "$SOURCE_SIZE" ]; then
    echo "WARNING: Could not determine source size, skipping space check" >&2
else
    # Get available space in current directory (in KB)
    AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
    if [ "$SOURCE_SIZE" -gt "$AVAILABLE_SPACE" ]; then
        error_exit "Insufficient disk space in current directory. Need approximately ${SOURCE_SIZE}KB, have ${AVAILABLE_SPACE}KB"
    fi
fi

# -------------------------------
# Step 6: Create archive with timestamp
# -------------------------------
SOURCE_BASENAME=$(basename "$SOURCE")
ARCHIVE_NAME="backup_${SOURCE_BASENAME}_${TIMESTAMP}.tar.gz"

echo "Creating archive: $ARCHIVE_NAME from $SOURCE"

if ! tar -czf "$ARCHIVE_NAME" -C "$(dirname "$SOURCE")" "$SOURCE_BASENAME" 2>/dev/null; then
    # Clean up partial archive if it exists
    rm -f "$ARCHIVE_NAME"
    error_exit "tar command failed to create archive"
fi

# Verify archive was created and has content
if [ ! -f "$ARCHIVE_NAME" ] || [ ! -s "$ARCHIVE_NAME" ]; then
    rm -f "$ARCHIVE_NAME"
    error_exit "Archive file is missing or empty after tar operation"
fi

echo "Archive created successfully: $ARCHIVE_NAME ($(du -h "$ARCHIVE_NAME" | cut -f1))"

# -------------------------------
# Step 7: Move to destination
# -------------------------------
echo "Moving archive to: $DEST/"

# Check if file already exists at destination
if [ -f "$DEST/$ARCHIVE_NAME" ]; then
    echo "WARNING: File already exists at destination: $DEST/$ARCHIVE_NAME" >&2
    echo "Generating unique filename to avoid overwrite" >&2
    
    # Generate unique filename with counter
    COUNTER=1
    UNIQUE_ARCHIVE="${ARCHIVE_NAME%.tar.gz}_${COUNTER}.tar.gz"
    while [ -f "$DEST/$UNIQUE_ARCHIVE" ]; do
        COUNTER=$((COUNTER + 1))
        UNIQUE_ARCHIVE="${ARCHIVE_NAME%.tar.gz}_${COUNTER}.tar.gz"
    done
    ARCHIVE_NAME="$UNIQUE_ARCHIVE"
    echo "Using filename: $ARCHIVE_NAME" >&2
fi

if ! mv "$ARCHIVE_NAME" "$DEST/"; then
    # Clean up archive in current directory if mv fails
    rm -f "$ARCHIVE_NAME"
    error_exit "Failed to move archive to destination"
fi

# -------------------------------
# Step 8: Verify final archive
# -------------------------------
if [ ! -f "$DEST/$ARCHIVE_NAME" ]; then
    error_exit "Archive not found at destination after move"
fi

if [ ! -s "$DEST/$ARCHIVE_NAME" ]; then
    error_exit "Archive at destination is empty"
fi

# -------------------------------
# Step 9: Success
# -------------------------------
FINAL_SIZE=$(du -h "$DEST/$ARCHIVE_NAME" | cut -f1)
echo "BACKUP COMPLETE: $DEST/$ARCHIVE_NAME ($FINAL_SIZE)"
echo "Source: $SOURCE"
echo "Timestamp: $TIMESTAMP"

# Exit with success
exit 0
