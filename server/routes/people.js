const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Listar todas as pessoas
router.get('/', async (req, res) => {
    try {
        const people = await prisma.person.findMany({
            include: {
                cell: { select: { id: true, name: true } },
                consolidation: true
            }
        });
        res.json(people);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pessoas' });
    }
});

// Busca pessoa por ID
router.get('/:id', async (req, res) => {
    try {
        const person = await prisma.person.findUnique({
            where: { id: req.params.id },
            include: {
                cell: { select: { id: true, name: true } },
                consolidation: true,
                personTracks: { include: { track: true } },
                pastoralNotes: { orderBy: { date: 'desc' } },
                visits: { orderBy: { date: 'desc' } }
            }
        });
        if (!person) return res.status(404).json({ error: 'Pessoa não encontrada' });
        res.json(person);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pessoa' });
    }
});

// Cadastra nova pessoa
router.post('/', async (req, res) => {
    const data = req.body;

    try {
        // Configura os dados iniciais
        const createData = {
            name: data.name,
            phone: data.phone,
            email: data.email,
            birthdate: data.birthdate,
            address: data.address,
            status: data.status || 'Visitante',
            howKnown: data.howKnown,
            previousCell: data.previousCell,
            returnReason: data.returnReason,
            prayerRequest: data.prayerRequest,
            cellId: data.cellId || null,
        };

        // Auto-cria processo de consolidação se for Novo Convertido
        if (createData.status === 'Novo Convertido') {
            createData.consolidation = {
                create: { status: 'PENDING' }
            };
        }

        const person = await prisma.person.create({
            data: createData,
            include: { consolidation: true }
        });

        // NOTIFICAÇÃO AO LÍDER (Se tiver cellId)
        if (createData.cellId) {
            const cell = await prisma.cell.findUnique({
                where: { id: createData.cellId },
                select: { leaderId: true, viceLeaderId: true, name: true }
            });
            if (cell && (cell.leaderId || cell.viceLeaderId)) {
                const notifsToCreate = [];
                const msg = `${person.name} foi adicionado(a) à sua célula (${cell.name}). Verifique a lista de membros.`;
                const actionUrl = `#/profile?id=${person.id}`;
                if (cell.leaderId) notifsToCreate.push({ userId: cell.leaderId, title: "Novo membro", message: msg, action: actionUrl });
                if (cell.viceLeaderId) notifsToCreate.push({ userId: cell.viceLeaderId, title: "Novo membro", message: msg, action: actionUrl });

                if (notifsToCreate.length > 0) {
                    await prisma.notification.createMany({ data: notifsToCreate });
                }
            }
        }

        res.status(201).json(person);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar pessoa', details: error.message });
    }
});

// Atualiza pessoa
router.put('/:id', async (req, res) => {
    const data = req.body;
    try {
        // Busca status anterior para ver se virou novo convertido agora
        const existing = await prisma.person.findUnique({
            where: { id: req.params.id },
            include: { consolidation: true }
        });

        if (!existing) return res.status(404).json({ error: 'Pessoa não encontrada' });

        const isNowConvert = data.status === 'Novo Convertido';
        const wasConvert = existing.status === 'Novo Convertido';

        const updateData = {
            name: data.name,
            phone: data.phone,
            email: data.email,
            birthdate: data.birthdate,
            address: data.address,
            status: data.status,
            howKnown: data.howKnown,
            previousCell: data.previousCell,
            returnReason: data.returnReason,
            prayerRequest: data.prayerRequest,
            cellId: data.cellId || null,
        };

        // Manipula o status de consolidação
        if (!wasConvert && isNowConvert && !existing.consolidation) {
            updateData.consolidation = {
                create: { status: 'PENDING' }
            };
        } else if (data.consolidationStatus && existing.consolidation) {
            updateData.consolidation = {
                update: {
                    status: data.consolidationStatus,
                    completedDate: data.consolidationStatus === 'COMPLETED' ? new Date() : null
                }
            };
        }

        const person = await prisma.person.update({
            where: { id: req.params.id },
            data: updateData,
            include: { consolidation: true }
        });

        // NOTIFICAÇÃO AO LÍDER (Se ele entrou numa célula nova agora)
        if (data.cellId && data.cellId !== existing.cellId) {
            const cell = await prisma.cell.findUnique({
                where: { id: data.cellId },
                select: { leaderId: true, viceLeaderId: true, name: true }
            });
            if (cell && (cell.leaderId || cell.viceLeaderId)) {
                const notifs = [];
                const msg = `${person.name} foi recém-transferido ou atribuído à sua célula (${cell.name}).`;
                const actionUrl = `#/profile?id=${person.id}`;
                if (cell.leaderId) notifs.push({ userId: cell.leaderId, title: "Novo membro na Célula", message: msg, action: actionUrl });
                if (cell.viceLeaderId) notifs.push({ userId: cell.viceLeaderId, title: "Novo membro na Célula", message: msg, action: actionUrl });

                if (notifs.length > 0) {
                    await prisma.notification.createMany({ data: notifs });
                }
            }
        }
        res.json(person);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar pessoa' });
    }
});

// Deleta pessoa
router.delete('/:id', async (req, res) => {
    try {
        await prisma.person.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar pessoa' });
    }
});

module.exports = router;
