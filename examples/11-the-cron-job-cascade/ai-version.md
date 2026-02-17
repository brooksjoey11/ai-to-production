#!/bin/bash
# AI-generated sync script
# Runs every minute via cron: * * * * * /usr/local/bin/sync-data.sh

echo "$(date): Starting sync" >> /var/log/sync.log

# Sync data from primary to backup
rsync -avz /data/primary/ /data/backup/

# Process any pending files
for file in /data/incoming/*; do
    if [ -f "$file" ]; then
        echo "Processing $file"
        python3 /usr/local/bin/process_file.py "$file"
        mv "$file" /data/processed/
    fi
done

# Generate report
/usr/local/bin/generate-report.sh

# Clean up old logs
find /var/log -name "*.log" -mtime +30 -delete

echo "$(date): Sync complete" >> /var/log/sync.log