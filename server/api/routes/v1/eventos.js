const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requirePermission } = require('../../middleware/apiAuth');
const { dispatchWebhook } = require('../../controllers/webhooksController');

const prisma = new PrismaClient();

// GET /api/v1/eventos
router.get('/', requirePermission('read_eventos'), async (req, res) => {
    try {
        const { from, to, page = 1, limit = 50 } = req.query;
        const where = {};
        if (from) where.date = { gte: from };
        if (to) where.date = { ...where.date, lte: to };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [events, total] = await Promise.all([
            prisma.event.findMany({ where, skip, take: parseInt(limit), orderBy: { date: 'asc' } }),
            prisma.event.count({ where })
        ]);
        res.json({ success: true, data: events, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro ao buscar eventos.' });
    }
});

// POST /api/v1/eventos
router.post('/', requirePermission('write_eventos'), async (req, res) => {
    try {
        const { title, date, startTime, endTime, description, color, type, location, recurrence } = req.body;
        if (!title || !date) return res.status(400).json({ success: false, error: 'Campos "title" e "date" são obrigatórios.' });

        const event = await prisma.event.create({
            data: { title, date, startTime, endTime, description, color: color || 'blue', type: type || 'event', location, recurrence: recurrence || 'none' }
        });
        dispatchWebhook('evento.created', event).catch(() => { });
        res.status(201).json({ success: true, data: event });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro ao criar evento.' });
    }
});

module.exports = router;
