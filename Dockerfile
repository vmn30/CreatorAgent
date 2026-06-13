FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --silent 2>/dev/null || true

# Copy Prisma schema
COPY prisma ./prisma/

# Copy source code and build output
COPY . .

# Set up environment
ENV DATABASE_URL=file:/app/db/custom.db
RUN mkdir -p db

# Copy .z-ai-config if available
COPY .z-ai-config* ./

# Generate Prisma client
RUN npx prisma generate 2>/dev/null || true

# Build if .next doesn't exist
RUN if [ ! -d .next ]; then npm run build; fi

# Initialize database on startup and start Next.js
CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>/dev/null; npx next start -p 3000"]
