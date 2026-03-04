# server/Dockerfile
# Usando a base Debian (glibc) que é recomendada nativamente pelo Prisma 
# para resolver o erro "libssl.so.1.1: No such file or directory" no Linux Alpine
FROM node:20-bullseye-slim

WORKDIR /app

# Instala dependências (inclui devDependencies porque o CLI do prisma está lá)
COPY package*.json ./
RUN npm ci

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
