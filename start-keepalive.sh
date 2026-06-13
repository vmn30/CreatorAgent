#!/bin/bash
cd /home/z/my-project

while true; do
    echo "[$(date)] Starting application..."
    node scripts/setup-config.mjs
    node scripts/init-db.mjs
    npx next start -p 3000
    
    EXIT_CODE=$?
    echo "[$(date)] Application exited with code $EXIT_CODE, restarting in 3s..."
    sleep 3
done
