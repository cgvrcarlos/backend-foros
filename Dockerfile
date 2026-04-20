# ===========================================
# Production Dockerfile
# Optimizado para Railway + Docker local
# ===========================================

FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Instalar todas las dependencias (incluye devDependencies para build)
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma client y build
RUN npx prisma generate
RUN npm run build

# ===========================================
# Imagen final (lightweight)
# ===========================================
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copiar node_modules (incluye Prisma client generado)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# NO ejecutar npm ci --only=production aquí (sobrescribiría el Prisma client)
# Los node_modules ya tienen todo lo necesario del build

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENV PORT=3001

CMD ["./docker-entrypoint.sh"]