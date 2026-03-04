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
    wget gnupg libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 fonts-liberation \
    libxshmfence1 && rm -rf /var/lib/apt/lists/*

# Copia o restante do projeto do backend (inclui a pasta prisma/ contendo o SQLite local)
COPY . .

# Gera o Prisma Client DENTRO do sistema operacional do container (Debian Músculo)
RUN npx prisma generate

# Mantém o Prisma CLI instalado para rodar migrations (db push) na inicialização do container

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Atualiza o banco com eventuais novos campos do schema.prisma ANTES de rodar a aplicação
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node index.js"]
