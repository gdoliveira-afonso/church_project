const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requirePermission } = require('../../middleware/apiAuth');

const prisma = new PrismaClient();

// GET /api/v1/turmas
router.get('/', requirePermission('read_membros'), async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [cells, total] = await Promise.all([
            prisma.cell.findMany({
                skip,
                take: parseInt(limit),
                include: { generation: { select: { id: true, name: true } } },
                orderBy: { name: 'asc' }
            }),
            prisma.cell.count()
        ]);
        res.json({ success: true, data: cells, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro ao buscar turmas.' });
    }
});

module.exports = router;
