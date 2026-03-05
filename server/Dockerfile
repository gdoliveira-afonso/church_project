# server/Dockerfile
# Usando a base Debian (glibc) que é recomendada nativamente pelo Prisma 
# para resolver o erro "libssl.so.1.1: No such file or directory" no Linux Alpine
FROM node:20-bullseye-slim

WORKDIR /app

# Instala dependências (inclui devDependencies porque o CLI do prisma está lá)
COPY package*.json ./
RUN npm ci

# Instalação das dependências do sistema para o Chromium / Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copia o restante do projeto do backend
COPY . .

# Gera o Prisma Client inicial
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Inicializa o banco (cria tabelas se não existirem) e inicia o servidor
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node index.js"]
