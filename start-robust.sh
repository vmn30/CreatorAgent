#!/bin/bash
trap 'echo "Received signal, ignoring..."' SIGTERM SIGINT SIGHUP

cd /home/z/my-project

while true; do
    echo "[$(date)] Starting application..."
    node scripts/setup-config.mjs
    node scripts/init-db.mjs
    
    # Start next in background
    npx next start -p 3000 &
    NEXT_PID=$!
    echo "[$(date)] Next.js PID: $NEXT_PID"
    
    # Wait for it
    wait $NEXT_PID
    EXIT_CODE=$?
    echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 5s..."
    sleep 5
done
