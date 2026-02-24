#!/bin/bash

# Simple backup script
# Usage: ./backup.sh /source/dir /backup/dir

SOURCE=$1
DEST=$2

tar -czf backup.tar.gz $SOURCE
mv backup.tar.gz $DEST
echo "Backup complete!"
