const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({ where: { username: 'leonardo' } });
    if (!user) return console.log('Leonardo not found');
    console.log('User Leonardo:', JSON.stringify(user, null, 2));

    const generation = await prisma.generation.findUnique({ where: { id: user.generationId } });
    console.log('Generation:', JSON.stringify(generation, null, 2));

    const cells = await prisma.cell.findMany({ where: { name: { contains: 'Gadi' } } });
    console.log('Cell Gaditas:', JSON.stringify(cells, null, 2));

    const triages = await prisma.triageQueue.findMany();
    const forwarded = triages.filter(t => t.status === 'forwarded_generation');
    console.log('Forwarded Triages:', JSON.stringify(forwarded.map(t => ({ id: t.id, status: t.status, data: t.data })), null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
