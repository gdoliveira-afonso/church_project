# CRM Celular

Sistema de gestão de membros e células para igrejas.

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/)
- `openssl` (apenas para instalação em Linux)

---

## Instalação Rápida (Linux/Mac)

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd <pasta-do-projeto>

# 2. Execute o script de instalação
#    Ele gera automaticamente um JWT_SECRET seguro e cria o .env
chmod +x install.sh
./install.sh

# 3. Suba os containers
docker-compose up -d
```

---

## Instalação Manual

Se preferir configurar manualmente:

```bash
# 1. Copie o arquivo de exemplo
cp .env.example .env

# 2. Gere um JWT_SECRET seguro
openssl rand -hex 32

# 3. Edite o .env e cole o valor gerado no campo JWT_SECRET
nano .env

# 4. Suba os containers
docker-compose up -d
```

---

## Variáveis de Ambiente

| Variável       | Obrigatória | Descrição                                          |
|----------------|-------------|---------------------------------------------------|
| `JWT_SECRET`   | **Sim**     | Chave secreta para assinar tokens JWT. Gere com `openssl rand -hex 32`. |
| `PORT`         | Não         | Porta do servidor backend. Padrão: `3000`          |
| `DATABASE_URL` | Não         | URL do banco de dados. Padrão: `file:./prisma/dev.db` (SQLite) |
| `UPLOAD_DIR`   | Não         | Diretório de uploads. Padrão: `./uploads`          |

> [!IMPORTANT]
> O servidor **recusará iniciar** se `JWT_SECRET` não estiver definido.

### Exemplo de `.env`

```env
JWT_SECRET=a3f8c2e1d4b7a9f0e2c5d8b1a4f7e0d3c6b9a2f5e8d1b4c7a0f3e6d9b2a5f8e1
PORT=4000
DATABASE_URL="file:./prisma/dev.db"
```

---

## Banco de Dados

### Desenvolvimento — SQLite (padrão)

SQLite é usado por padrão. O arquivo de banco é criado localmente em `server/prisma/dev.db` e **não é versionado pelo Git**.

```env
DATABASE_URL="file:./prisma/dev.db"
```

### Produção — PostgreSQL (recomendado)

Para ambientes de produção, recomenda-se PostgreSQL. Para migrar:

1. Edite `server/prisma/schema.prisma` e troque o `provider`:
```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

2. Atualize o `.env` com a connection string do Postgres:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/church_crm"
```

3. Execute as migrações:
```bash
cd server
npx prisma migrate deploy
```

O `docker-compose.yml` já inclui um serviço PostgreSQL comentado pronto para ser ativado.

---

## Desenvolvimento Local

Para rodar o backend localmente (sem Docker):

```bash
cd server

# Crie e configure o .env local
cp .env.example .env  # edite e defina JWT_SECRET e DATABASE_URL

npm install
node index.js
```

---

## Segurança

- **`JWT_SECRET`** deve ser único por instância e nunca reutilizado entre ambientes.
- Nunca faça commit do arquivo `.env` — ele está no `.gitignore`.
- Arquivos de banco de dados (`.db`, `.sqlite`) são ignorados pelo Git.
- Para rotacionar o JWT secret, gere um novo valor e reinicie o servidor (tokens existentes serão invalidados).
