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

# Backup do schema para garantir que ele não seja sobrescrito pelo volume no runtime
RUN cp prisma/schema.prisma /app/schema.prisma.backup

# Gera o Prisma Client inicial
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Atualiza o banco com eventuais novos campos do schema.prisma ANTES de rodar a aplicação
# Atualiza o banco e gera o client ANTES de rodar a aplicação
# O 'cp' garante que o volume não sobrescreva o schema atualizado do código
CMD ["sh", "-c", "cp /app/schema.prisma.backup /app/prisma/schema.prisma && npx prisma db push --accept-data-loss && npx prisma generate && node index.js"]
