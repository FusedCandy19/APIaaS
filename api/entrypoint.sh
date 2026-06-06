#!/bin/sh
set -e

# Ensure certs directory exists
mkdir -p /certs

# Generate self-signed certificates if they don't exist
if [ ! -f /certs/server.key ] || [ ! -f /certs/server.crt ]; then
  echo "Generating self-signed SSL certificates..."
  openssl req -x509 -newkey rsa:4096 \
    -keyout /certs/server.key \
    -out /certs/server.crt \
    -days 365 -nodes \
    -subj "/CN=localhost" \
    -addext "subjectAltName=IP:127.0.0.1,DNS:localhost,DNS:api"
  echo "Certificates generated successfully."
else
  echo "Using existing SSL certificates."
fi

# Run prisma client generation
echo "Generating Prisma Client..."
npx prisma generate

# Pushes schema to Postgres DB
echo "Synchronizing database schema with Prisma..."
npx prisma db push --accept-data-loss

# Run database seeding
echo "Seeding database..."
npx tsx src/seed.ts

# Start the Fastify backend
echo "Starting Fastify server..."
exec npx tsx src/server.ts
