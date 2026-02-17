# PRODUCTION-READY BACKUP SCRIPT: backup.sh

## TABLE OF CONTENTS
1. Prerequisites
2. Script Overview
3. Complete Production Script
4. Step-by-Step Installation
5. Usage Instructions
6. Verification Procedures
7. Troubleshooting
8. Dependencies

---

## 1. PREREQUISES

### Required System Tools
- **bash** (version 4.0 or later)
- **tar** (any version with -czf support)
- **mv** (any version)
- **dirname** / **basename** (standard core utilities)

### Required Permissions
- Read access to source directory
- Write access to current working directory (for temporary archive)
- Write access to destination directory

### Environment
- No specific environment variables required
- Script uses standard POSIX-compliant commands

---

## 2. SCRIPT OVERVIEW

This production-ready backup script creates a timestamped compressed archive of a source directory and safely moves it to a specified destination with comprehensive error checking, validation, and verification at every step.

**Key Features:**
- Full argument validation
- Path existence and permissions checking
- Safe filename handling with timestamps
- Exit code verification for all commands
- Meaningful error messages
- Verification of successful operation
- Proper quoting for paths with spaces
- Non-destructive operation (no silent overwrites)

---

## 3. COMPLETE PRODUCTION SCRIPT

```bash
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
```

---

## 4. STEP-BY-STEP INSTALLATION

### Step 1: Create the script file
```bash
nano backup.sh
```

### Step 2: Copy the complete script above into the file
- Use the complete script from Section 3
- Save with Ctrl+O, then Ctrl+X (in nano)

### Step 3: Make the script executable
```bash
chmod +x backup.sh
```

### Step 4: Verify installation
```bash
./backup.sh
```
Expected output:
```
ERROR: Exactly two arguments required (received 0)
Usage: backup.sh SOURCE_DIRECTORY DESTINATION_DIRECTORY
```

### Step 5: (Optional) Move to system PATH
```bash
sudo cp backup.sh /usr/local/bin/
```
Now you can run `backup.sh` from anywhere

---

## 5. USAGE INSTRUCTIONS

### Basic Usage
```bash
./backup.sh /path/to/source /path/to/destination
```

### Examples

**Back up documents to external drive:**
```bash
./backup.sh /home/username/Documents /media/backup_drive
```

**Back up with paths containing spaces:**
```bash
./backup.sh "/home/username/My Documents" "/mnt/backup/My Backups"
```

**Using full paths from anywhere (if installed to PATH):**
```bash
backup.sh /etc /backup/system
```

### Output Examples

**Successful backup:**
```
Creating archive: backup_documents_20250217_143022.tar.gz from /home/user/Documents
Archive created successfully: backup_documents_20250217_143022.tar.gz (125M)
Moving archive to: /backup/
BACKUP COMPLETE: /backup/backup_documents_20250217_143022.tar.gz (125M)
Source: /home/user/Documents
Timestamp: 20250217_143022
```

**Error - source missing:**
```
ERROR: Source does not exist: /nonexistent
```

**Error - destination not writable:**
```
ERROR: Destination directory is not writable: /protected/backup
```

---

## 6. VERIFICATION PROCEDURES

### After Running the Script

**1. Verify the archive exists:**
```bash
ls -la /destination/directory/backup_*.tar.gz
```

**2. Check archive contents:**
```bash
tar -tzf /destination/directory/backup_*.tar.gz | head -20
```
(This lists first 20 files in archive to verify structure)

**3. Verify archive integrity:**
```bash
tar -tzf /destination/directory/backup_*.tar.gz > /dev/null
echo $?
```
(Should return 0 if archive is valid)

**4. Check file size is reasonable:**
```bash
du -h /destination/directory/backup_*.tar.gz
```

**5. Test a full extraction to verify (optional):**
```bash
mkdir test_extract
cd test_extract
tar -xzf /destination/directory/backup_*.tar.gz
ls -la
cd .. && rm -rf test_extract
```

### Automated Verification Script

Save this as `verify_backup.sh`:
```bash
#!/bin/bash
BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 backup_file.tar.gz"
    exit 1
fi

echo "Verifying: $BACKUP_FILE"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "FAILED: File does not exist"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Size: $FILE_SIZE"

if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    FILE_COUNT=$(tar -tzf "$BACKUP_FILE" 2>/dev/null | wc -l)
    echo "PASSED: Archive contains $FILE_COUNT files/directories"
    exit 0
else
    echo "FAILED: Archive is corrupted or invalid"
    exit 1
fi
```

---

## 7. TROUBLESHOOTING

| Error Message | Likely Cause | Solution |
|----------------|--------------|----------|
| `Exactly two arguments required` | Missing source or destination | Run with both paths: `./backup.sh /source /dest` |
| `Source does not exist` | Typo in source path | Check path with `ls -ld /path/to/source` |
| `Source is not a directory` | Provided file instead of directory | Script backs up directories only |
| `Source directory is not readable` | Permission denied | Check with `ls -ld /source`; fix with `chmod +r` or run as appropriate user |
| `Destination is not a directory` | Destination path incorrect | Create directory: `mkdir -p /destination` |
| `Destination not writable` | No write permission | Check with `touch /destination/test`; fix permissions |
| `Current directory not writable` | Running from read-only location | `cd` to writable directory first |
| `tar command failed` | Source read error or tar issue | Check `tar -czf test.tar.gz /source` manually |
| `Failed to move archive` | Destination full or mv error | Check `df -h /destination` for space |
| `Archive not found after move` | Move succeeded but file missing | Check `ls -la /destination` for unexpected filename |

### Quick Diagnostic Commands

**Check source readability:**
```bash
test -r /source && echo "Readable" || echo "Not readable"
```

**Check destination writability:**
```bash
test -w /destination && echo "Writable" || echo "Not writable"
```

**Check available space:**
```bash
df -h . && df -h /destination
```

**Test tar manually:**
```bash
tar -czf test.tar.gz /source && echo "Tar works" || echo "Tar failed"
```

---

## 8. DEPENDENCIES

### Required Commands (with minimal versions)
| Command | Purpose | Version Check Command |
|---------|---------|----------------------|
| bash | Script interpreter | `bash --version \| head -1` |
| tar | Archive creation | `tar --version \| head -1` |
| mv | File movement | `mv --version \| head -1` |
| du | Disk usage | `du --version \| head -1` |
| df | Free space | `df --version \| head -1` |
| basename | Path parsing | Part of coreutils |
| dirname | Path parsing | Part of coreutils |

### Installation Commands (if missing)

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tar coreutils
```

**RHEL/CentOS/Fedora:**
```bash
sudo yum install tar coreutils
```
or
```bash
sudo dnf install tar coreutils
```

**macOS:**
```bash
# tar and coreutils are pre-installed
# For GNU versions (optional):
brew install coreutils
```

### System Requirements
- **OS:** Linux, macOS, or WSL (Windows Subsystem for Linux)
- **Disk Space:** At least as much free space as the source directory size (in current directory, temporarily)
- **Memory:** 50-100MB minimum (more for very large directories)

---

## NEXT STEPS

After implementing this backup script:

1. **Test thoroughly** with small directories first
2. **Set up cron job** for automated backups:
   ```bash
   crontab -e
   # Add: 0 2 * * * /usr/local/bin/backup.sh /important/data /backup/location
   ```
3. **Create monitoring** by saving logs:
   ```bash
   ./backup.sh /source /dest >> /var/log/backup.log 2>&1
   ```
4. **Implement rotation policy** (optional): Add script to delete backups older than X days
5. **Test restoration** periodically to ensure backups are valid