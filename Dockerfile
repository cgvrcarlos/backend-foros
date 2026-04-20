# ===========================================
# Production Dockerfile
# Optimizado para Railway + Docker local
# ===========================================

FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias primero (cache优化)
COPY package*.json ./
RUN npm ci --only=production

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

# Copiar solo lo necesario del builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Instalar runtime-only dependencies
RUN npm ci --only=production

EXPOSE 3001

# Puerto configurable via env
ENV PORT=3001

CMD ["node", "dist/main.js"]