FROM node:20-slim

WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema
COPY prisma ./prisma/

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# Initialize database on startup
CMD ["sh", "-c", "node scripts/setup-config.mjs && node scripts/init-db.mjs && npx next start -p 3000"]
