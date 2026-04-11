#!/bin/sh
exec /app/pocketbase serve \
  --http=0.0.0.0:8090 \
  --encryptionEnv=PB_ENCRYPTION_KEY \
  --dir=/app/pb_data \
  --migrationsDir=/app/pb_migrations \
  --hooksDir=/app/pb_hooks \
  --hooksWatch=false
