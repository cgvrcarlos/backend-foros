FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl libssl3 && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma files
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY dist ./dist/
COPY package*.json ./

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main.js"]