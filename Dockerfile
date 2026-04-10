FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y wget unzip ca-certificates && rm -rf /var/lib/apt/lists/*

ARG PB_VERSION=0.36.7
RUN wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /app/pocketbase

COPY apps/pocketbase/pb_migrations /app/pb_migrations
COPY apps/pocketbase/pb_hooks /app/pb_hooks

EXPOSE 8090

CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/app/pb_data", "--migrationsDir=/app/pb_migrations", "--hooksDir=/app/pb_hooks", "--hooksWatch=false"]
