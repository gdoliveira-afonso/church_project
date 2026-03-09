const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const eventId = 'test-event-id';
        const date = '2026-03-09';
        const canceled = 1;
        const newTitle = 'Test';

        console.log('Testing INSERT ON CONFLICT...');
        await prisma.$executeRawUnsafe(`
            INSERT INTO "EventException" ("eventId", "date", "canceled", "newTitle")
            VALUES (?, ?, ?, ?)
            ON CONFLICT("eventId", "date") DO UPDATE SET
                "canceled" = excluded.canceled,
                "newTitle" = excluded.newTitle
        `, eventId, date, canceled, newTitle);
        console.log('Success!');
    } catch (e) {
        console.error('FAILED:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
