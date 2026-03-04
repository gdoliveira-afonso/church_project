const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAndCheck() {
    console.log('Inserting test custom field...');
    await prisma.systemConfig.upsert({
        where: { key: 'cellCustomFields' },
        update: { value: 'Cestas Básicas, Batismos, Visitantes' },
        create: { key: 'cellCustomFields', value: 'Cestas Básicas, Batismos, Visitantes' }
    });

    const config = await prisma.systemConfig.findUnique({
        where: { key: 'cellCustomFields' }
    });
    console.log('Current value in DB:', config.value);
}

seedAndCheck()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
