const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/logs — lista logs com filtros
router.get('/', async (req, res) => {
    try {
        const { action, resource, userId, from, to, limit = 200 } = req.query;

        const where = {};
        if (action && action !== 'all') where.action = action;
        if (resource && resource !== 'all') where.resource = resource;
        if (userId) where.userId = userId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = toDate;
            }
        }

        const logs = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(parseInt(limit), 500),
        });

        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
});

// DELETE /api/logs — limpa todos os logs (somente admin)
router.delete('/', async (req, res) => {
    try {
        await prisma.activityLog.deleteMany({});
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao limpar logs' });
    }
});

module.exports = router;
