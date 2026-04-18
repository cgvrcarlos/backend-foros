FROM node:20-slim

WORKDIR /app

# OpenSSL (Prisma)
RUN apt-get update && apt-get install -y openssl libssl3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
