const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.user.count();
    console.log(`Existem ${count} usuários no banco de dados.`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
