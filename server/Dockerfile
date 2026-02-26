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

# Remove as 'devDependencies' como o CLI do Prisma pesadão e mantém o cache leve pra produção
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Executa diretamente o node (já que no package original não havia script de "start")
CMD ["node", "index.js"]
