const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/backup - Exporta todos os dados do sistema em JSON
router.get('/backup', async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const data = {
            users: await prisma.user.findMany(),
            generations: await prisma.generation.findMany(),
            cells: await prisma.cell.findMany(),
            people: await prisma.person.findMany(),
            consolidations: await prisma.consolidation.findMany(),
            milestones: await prisma.personMilestone.findMany(),
            attendance: await prisma.attendance.findMany(),
            attendanceRecords: await prisma.attendanceRecord.findMany(),
            pastoralNotes: await prisma.pastoralNote.findMany(),
            visits: await prisma.visit.findMany(),
            systemSettings: await prisma.systemSettings.findMany(),
            events: await prisma.event.findMany(),
            eventExceptions: await prisma.eventException.findMany(),
            cellCancellations: await prisma.cellCancellation.findMany(),
            cellJustifications: await prisma.cellJustification.findMany(),
            tracks: await prisma.track.findMany(),
            personTracks: await prisma.personTrack.findMany(),
            notifications: await prisma.notification.findMany(),
            forms: await prisma.form.findMany(),
            triageQueue: await prisma.triageQueue.findMany(),
            systemConfig: await prisma.systemConfig.findMany(),
            apiKeys: await prisma.apiKey.findMany(),
            webhooks: await prisma.webhook.findMany(),
            webhookLogs: await prisma.webhookLog.findMany(),
            // Activity logs podem ser grandes, mas vamos incluir no backup total
            activityLogs: await prisma.activityLog.findMany()
        };

        const filename = `backup-igreja-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Erro no backup:', err);
        res.status(500).json({ error: 'Falha ao gerar backup' });
    }
});

// POST /api/admin/restore - Restaura dados a partir de um JSON
router.post('/restore', async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const data = req.body;
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Dados de backup inválidos' });
        }

        // 1. Desabilitar constraints e limpar tabelas (Ordem específica para evitar erros de FK em alguns bancos)
        // No SQLite usamos PRAGMA foreign_keys = OFF;
        // No Postgres usamos TRUNCATE ... CASCADE ou SET CONSTRAINTS ALL DEFERRED;

        const isSqlite = prisma.$parent === undefined; // Heurística simples se não soubermos o engine exato via env aqui

        await prisma.$transaction(async (tx) => {
            // Ordem de deleção (filhos primeiro)
            await tx.webhookLog.deleteMany();
            await tx.webhook.deleteMany();
            await tx.apiKey.deleteMany();
            await tx.systemConfig.deleteMany();
            await tx.triageQueue.deleteMany();
            await tx.form.deleteMany();
            await tx.notification.deleteMany();
            await tx.personTrack.deleteMany();
            await tx.track.deleteMany();
            await tx.cellJustification.deleteMany();
            await tx.cellCancellation.deleteMany();
            await tx.eventException.deleteMany();
            await tx.event.deleteMany();
            await tx.systemSettings.deleteMany();
            await tx.visit.deleteMany();
            await tx.pastoralNote.deleteMany();
            await tx.attendanceRecord.deleteMany();
            await tx.attendance.deleteMany();
            await tx.personMilestone.deleteMany();
            await tx.consolidation.deleteMany();
            await tx.person.deleteMany();
            await tx.cell.deleteMany();
            await tx.user.deleteMany();
            await tx.generation.deleteMany();
            await tx.activityLog.deleteMany();

            // 2. Inserir dados do backup (Ordem inversa da deleção)
            if (data.generations) await tx.generation.createMany({ data: data.generations });
            if (data.users) await tx.user.createMany({ data: data.users });
            if (data.cells) await tx.cell.createMany({ data: data.cells });
            if (data.people) await tx.person.createMany({ data: data.people });
            if (data.consolidations) await tx.consolidation.createMany({ data: data.consolidations });
            if (data.milestones) await tx.personMilestone.createMany({ data: data.milestones });
            if (data.attendance) await tx.attendance.createMany({ data: data.attendance });
            if (data.attendanceRecords) await tx.attendanceRecord.createMany({ data: data.attendanceRecords });
            if (data.pastoralNotes) await tx.pastoralNote.createMany({ data: data.pastoralNotes });
            if (data.visits) await tx.visit.createMany({ data: data.visits });
            if (data.systemSettings) await tx.systemSettings.createMany({ data: data.systemSettings });
            if (data.events) await tx.event.createMany({ data: data.events });
            if (data.eventExceptions) await tx.eventException.createMany({ data: data.eventExceptions });
            if (data.cellCancellations) await tx.cellCancellation.createMany({ data: data.cellCancellations });
            if (data.cellJustifications) await tx.cellJustification.createMany({ data: data.cellJustifications });
            if (data.tracks) await tx.track.createMany({ data: data.tracks });
            if (data.personTracks) await tx.personTrack.createMany({ data: data.personTracks });
            if (data.notifications) await tx.notification.createMany({ data: data.notifications });
            if (data.forms) await tx.form.createMany({ data: data.forms });
            if (data.triageQueue) await tx.triageQueue.createMany({ data: data.triageQueue });
            if (data.systemConfig) await tx.systemConfig.createMany({ data: data.systemConfig });
            if (data.apiKeys) await tx.apiKey.createMany({ data: data.apiKeys });
            if (data.webhooks) await tx.webhook.createMany({ data: data.webhooks });
            if (data.webhookLogs) await tx.webhookLog.createMany({ data: data.webhookLogs });
            if (data.activityLogs) await tx.activityLog.createMany({ data: data.activityLogs });
        });

        res.json({ success: true, message: 'Dados restaurados com sucesso. O sistema deve reiniciar.' });

        // Trigger exit to allow Docker/PM2 to restart the process
        setTimeout(() => process.exit(0), 1000);
    } catch (err) {
        console.error('Erro na restauração:', err);
        res.status(500).json({ error: 'Falha ao restaurar backup: ' + err.message });
    }
});

module.exports = router;
