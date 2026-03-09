const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany();
        console.log('Users found:', users.length);
        if (users.length > 0) {
            console.log('First user:', JSON.stringify(users[0], null, 2));
        }
        const settings = await prisma.systemSettings.findFirst();
        console.log('Settings found:', !!settings);
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
