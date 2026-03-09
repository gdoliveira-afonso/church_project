const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getNotificationConfig } = require('./config');

const router = express.Router();
const prisma = new PrismaClient();
console.log('[DEBUG] events.js carregado');

// ------------------------------------------------------------------
// HELPER: Notifica todos os líderes e vice-líderes
// ------------------------------------------------------------------
async function notifyAllLeaders(title, message, action) {
    try {
        const leaders = await prisma.user.findMany({
            where: { role: { in: ['LEADER', 'VICE_LEADER'] } },
            select: { id: true }
        });
        if (!leaders.length) return;
        await prisma.notification.createMany({
            data: leaders.map(u => ({ userId: u.id, title, message, action: action || null }))
        });
    } catch (e) {
        console.error('[notifyAllLeaders] Falha ao notificar líderes:', e.message);
    }
}

// ------------------------------------------------------------------
// EVENTOS
// ------------------------------------------------------------------

// Listar todos os eventos
router.get('/', async (req, res) => {
    try {
        const events = await prisma.event.findMany();
        const cellCancellations = await prisma.cellCancellation.findMany();
        const cellJustifications = await prisma.cellJustification.findMany();
        res.json({ events, cellCancellations, cellJustifications });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

// ------------------------------------------------------------------
// EVENT EXCEPTIONS (cancelar/renomear evento num dia específico)
// IMPORTANTE: deve ser registrado ANTES de /:id para evitar conflito
// ------------------------------------------------------------------
async function ensureExceptionTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EventException" (
            "id"        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            "eventId"   TEXT NOT NULL,
            "date"      TEXT NOT NULL,
            "canceled"  INTEGER NOT NULL DEFAULT 0,
            "newTitle"  TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE("eventId", "date")
        )
    `);
}

router.get('/exceptions/all', async (req, res) => {
    try {
        const rows = await prisma.eventException.findMany();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar todas as exceptions' });
    }
});

router.get('/:id/exceptions', async (req, res) => {
    try {
        const rows = await prisma.eventException.findMany({
            where: { eventId: req.params.id }
        });
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar exceptions' });
    }
});

router.post('/:id/exceptions', async (req, res) => {
    console.log('[DEBUG-V3] Recebeu POST em /:id/exceptions', req.params.id);
    const { date, canceled, newTitle } = req.body;
    if (!date) return res.status(400).json({ error: 'date obrigatorio' });
    try {
        await prisma.eventException.upsert({
            where: {
                eventId_date: {
                    eventId: req.params.id,
                    date: date
                }
            },
            update: {
                canceled: canceled || false,
                newTitle: newTitle || null
            },
            create: {
                eventId: req.params.id,
                date: date,
                canceled: canceled || false,
                newTitle: newTitle || null
            }
        });
        res.json({ success: true });
    } catch (e) {
        console.error('[EventException-V3] erro crítico:', e);
        res.status(500).json({ error: 'Erro ao salvar exception', details: e.message });
    }
});


// Busca um evento por ID
router.get('/:id', async (req, res) => {
    try {
        const event = await prisma.event.findUnique({ where: { id: req.params.id } });
        if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar evento' });
    }
});

// Cadastra evento
router.post('/', async (req, res) => {
    const data = req.body;
    try {
        const event = await prisma.event.create({
            data: {
                title: data.title,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                description: data.description,
                color: data.color || 'blue',
                type: data.type || 'event',
                category: data.category,
                location: data.location,
                recurrence: data.recurrence || 'none',
                reminder: data.reminder,
                icon: data.icon
            }
        });

        // Notifica todos os líderes sobre a nova programação
        const notifCfg = await getNotificationConfig();
        if (notifCfg.newEvent?.enabled !== false) {
            const dateFormatted = new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = data.startTime ? ` às ${data.startTime}` : '';
            const locationStr = data.location ? ` — ${data.location}` : '';
            const scopeLabel = data.category === 'geral' ? '🌐 [Evento Geral do Núcleo]' : '🏘️ [Evento Local]';
            await notifyAllLeaders(
                `📅 Nova Programação: ${event.title}`,
                `${scopeLabel} "${event.title}" em ${dateFormatted}${timeStr}${locationStr}.`,
                `#/calendar`
            );
        }

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar evento' });
    }
});

// Atualiza evento
router.put('/:id', async (req, res) => {
    const data = req.body;
    try {
        const existing = await prisma.event.findUnique({ where: { id: req.params.id } });

        const event = await prisma.event.update({
            where: { id: req.params.id },
            data: {
                title: data.title,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                description: data.description,
                color: data.color,
                type: data.type,
                category: data.category,
                location: data.location,
                recurrence: data.recurrence,
                reminder: data.reminder,
                icon: data.icon
            }
        });

        // Re-notifica líderes se data ou título mudaram
        if (existing && (existing.date !== data.date || existing.title !== data.title)) {
            const notifCfg = await getNotificationConfig();
            if (notifCfg.updatedEvent?.enabled !== false) {
                const dateFormatted = new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                const timeStr = data.startTime ? ` às ${data.startTime}` : '';
                const scopeLabel = data.category === 'geral' ? '🌐 [Geral]' : '🏘️ [Local]';
                await notifyAllLeaders(
                    `✏️ Programação Atualizada: ${event.title}`,
                    `${scopeLabel} "${event.title}" foi atualizado. Nova data: ${dateFormatted}${timeStr}.`,
                    `#/calendar`
                );
            }
        }

        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
});

// Deleta evento
router.delete('/:id', async (req, res) => {
    try {
        await prisma.event.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar evento' });
    }
});

module.exports = { router, notifyAllLeaders };


