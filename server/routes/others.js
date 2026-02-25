const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ------------------------------------------------------------------
// VISITAS
// ------------------------------------------------------------------
router.get('/visits', async (req, res) => {
    try {
        const visits = await prisma.visit.findMany({ include: { person: { select: { name: true } } }, orderBy: { date: 'desc' } });
        res.json(visits);
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar visitas' }); }
});

router.post('/visits', async (req, res) => {
    const { personId, date, type, notes, authorId } = req.body;
    try {
        const visit = await prisma.visit.create({
            data: { personId, date, type, notes, authorId }
        });

        // Gatilho Automático: Consolidação se for Visita de Consolidação (replicando a lógica do store.js)
        if (type === 'Visita de Consolidação') {
            const person = await prisma.person.findUnique({ where: { id: personId }, include: { consolidation: true } });
            if (person && person.status === 'Novo Convertido') {
                if (!person.consolidation) {
                    await prisma.consolidation.create({ data: { personId, status: 'IN_PROGRESS' } });
                } else if (person.consolidation.status !== 'COMPLETED') {
                    await prisma.consolidation.update({ where: { personId }, data: { status: 'IN_PROGRESS' } });
                }
            }
        }

        res.status(201).json(visit);
    } catch (err) { res.status(500).json({ error: 'Erro ao criar visita' }); }
});

// ------------------------------------------------------------------
// NOTAS PASTORAIS
// ------------------------------------------------------------------
router.get('/notes', async (req, res) => {
    try {
        const notes = await prisma.pastoralNote.findMany({ include: { person: { select: { name: true } } }, orderBy: { date: 'desc' } });
        res.json(notes);
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar notas' }); }
});

router.post('/notes', async (req, res) => {
    const { personId, date, type, text, authorId } = req.body;
    try {
        const note = await prisma.pastoralNote.create({
            data: { personId, date, type, text, authorId }
        });
        res.status(201).json(note);
    } catch (err) { res.status(500).json({ error: 'Erro ao criar nota' }); }
});

// ------------------------------------------------------------------
// TRILHAS (BATISMO, ESCOLA, ENCONTRO)
// ------------------------------------------------------------------
router.get('/tracks', async (req, res) => {
    try {
        const tracks = await prisma.track.findMany();
        res.json(tracks);
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar trilhas' }); }
});

router.post('/tracks/person', async (req, res) => {
    const { personId, trackId } = req.body;
    try {
        const pt = await prisma.personTrack.create({
            data: { personId, trackId, completed: true }
        });
        res.status(201).json(pt);
    } catch (err) { res.status(500).json({ error: 'Erro ao vincular pessoa à trilha (já existe?)' }); }
});

router.delete('/tracks/person/:personId/:trackId', async (req, res) => {
    try {
        await prisma.personTrack.deleteMany({
            where: { personId: req.params.personId, trackId: req.params.trackId }
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro ao remover vínculo' }); }
});

// ------------------------------------------------------------------
// DASHBOARD METRICS / RELATÓRIOS GERAIS
// ------------------------------------------------------------------
router.get('/metrics', async (req, res) => {
    try {
        const userId = req.query.userId;
        let peopleFilter = {};
        let cellsFilter = {};

        if (userId) {
            const reqUser = await prisma.user.findUnique({ where: { id: userId } });

            if (reqUser && (reqUser.role === 'LEADER' || reqUser.role === 'VICE_LEADER')) {
                // Find cells where this user is leader or vice-leader
                const myCells = await prisma.cell.findMany({
                    where: { OR: [{ leaderId: userId }, { viceLeaderId: userId }] },
                    select: { id: true }
                });

                const myCellIds = myCells.map(c => c.id);
                peopleFilter = { cellId: { in: myCellIds } };
                cellsFilter = { id: { in: myCellIds } };
            }
        }

        const people = await prisma.person.findMany({
            where: peopleFilter,
            include: { visits: true, personTracks: { include: { track: true } }, consolidation: true }
        });
        const totalPeople = people.length;
        const newConverts = people.filter(p => p.status === 'Novo Convertido').length;
        const totalCells = await prisma.cell.count({ where: cellsFilter });

        let wbCnt = 0;
        let encCnt = 0;
        const noVisit = [];
        const pendingBaptism = [];
        const delayedConsolidation = [];
        const reconciliations = [];

        const now = new Date();

        people.forEach(p => {
            const hasBatismo = p.personTracks.some(pt => pt.track.name.includes('Batismo'));
            const hasEncontro = p.personTracks.some(pt => pt.track.name.includes('Encontro'));

            if (hasBatismo) wbCnt++;
            else pendingBaptism.push(p);

            if (hasEncontro) encCnt++;

            const createdDaysAgo = Math.floor((now - new Date(p.createdAt)) / (1000 * 60 * 60 * 24));

            if (p.visits && p.visits.length > 0) {
                const lastVis = new Date(p.visits.sort((a, b) => b.date.localeCompare(a.date))[0].date);
                const daysDiff = Math.floor((now - lastVis) / (1000 * 60 * 60 * 24));
                if (daysDiff > 60 && createdDaysAgo > 60) noVisit.push(p);
            } else {
                // Membro nunca foi visitado, vamos olhar se ele já é membro há mais de 60 dias pra poder alertar
                if (createdDaysAgo > 60) noVisit.push(p);
            }

            if (p.status === 'Novo Convertido') {
                const consVisits = (p.visits || []).filter(v => v.type === 'Visita de Consolidação');
                if (consVisits.length > 0) {
                    const lastVis = new Date(consVisits.sort((a, b) => b.date.localeCompare(a.date))[0].date);
                    const daysDiff = Math.floor((now - lastVis) / (1000 * 60 * 60 * 24));
                    if (daysDiff > 15 && createdDaysAgo > 15) delayedConsolidation.push(p);
                } else {
                    if (createdDaysAgo > 15) delayedConsolidation.push(p);
                }
            }

            if (p.status === 'Reconciliação') {
                reconciliations.push(p);
            }
        });

        res.json({
            total: totalPeople,
            newConverts,
            cells: totalCells,
            waterBaptism: totalPeople ? Math.round((wbCnt / totalPeople) * 100) : 0,
            encounter: totalPeople ? Math.round((encCnt / totalPeople) * 100) : 0,
            noVisit: noVisit.length,
            delayedConsolidations: delayedConsolidation.length,
            reconciliations: reconciliations.length,
            actionLists: {
                noVisit,
                pendingBaptism,
                delayedConsolidation,
                reconciliations
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao carregar métricas' });
    }
});

// ------------------------------------------------------------------
// ADMIN: TRILHAS CRUD
// ------------------------------------------------------------------
router.post('/tracks', async (req, res) => {
    try {
        const track = await prisma.track.create({ data: req.body });
        res.status(201).json(track);
    } catch (err) { res.status(500).json({ error: 'Erro ao criar trilha' }); }
});

router.put('/tracks/:id', async (req, res) => {
    try {
        const track = await prisma.track.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(track);
    } catch (err) { res.status(500).json({ error: 'Erro ao atualizar' }); }
});

router.delete('/tracks/:id', async (req, res) => {
    try {
        await prisma.track.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro ao deletar' }); }
});

// ------------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------------
router.get('/notifications', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        const notifs = await prisma.notification.findMany({
            where: { userId, read: false },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifs);
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar notificações' }); }
});

router.put('/notifications/read', async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro ao marcar notificações como lidas' }); }
});

module.exports = router;
