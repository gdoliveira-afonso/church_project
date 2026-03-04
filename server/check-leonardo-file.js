const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({ where: { username: 'leonardo' } });
    const generation = user ? await prisma.generation.findUnique({ where: { id: user.generationId } }) : null;
    const cells = await prisma.cell.findMany();
    const triages = await prisma.triageQueue.findMany();
    const forwarded = triages.filter(t => t.status === 'forwarded_generation');

    fs.writeFileSync('output.json', JSON.stringify({ user, generation, cells, forwarded }, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
