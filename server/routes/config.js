// config.js — funções de configuração do sistema sem dependências circulares
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_NOTIFICATION_CONFIG = {
    newMember: { enabled: true },
    newEvent: { enabled: true },
    updatedEvent: { enabled: true },
    dailyReminder: { enabled: true }
};

async function getNotificationConfig() {
    try {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT value FROM "SystemConfig" WHERE key = 'notificationConfig' LIMIT 1`
        );
        if (rows && rows.length > 0) return JSON.parse(rows[0].value);
    } catch (e) { /* tabela ainda não existe: retorna default */ }
    return DEFAULT_NOTIFICATION_CONFIG;
}

module.exports = { getNotificationConfig };
