# Etapa 1: Base image
FROM node:20-alpine

# Setar a pasta de trabalho do container Backend
WORKDIR /app

# Copiar apenas arquivos do Node primeiro (package e prisma schema)
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependencias do projeto sem verbose pesado
RUN npm install --no-audit --no-fund

# Gerar o Prisma Client específico do ambiente Linux Alpine
RUN npx prisma generate

# Copiar os src / rotas / scripts do Node
COPY . .

# Expor a porta 3000 do container do Backend
EXPOSE 3000

# Script para iniciar garantindo que o banco de dados rodou no volume persistente
CMD ["npm", "start"]
