const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Lista todas as células (com acesso a seus membros via rota específica)
router.get('/', async (req, res) => {
    try {
        const cells = await prisma.cell.findMany({
            include: {
                _count: {
                    select: { people: true }
                }
            }
        });
        res.json(cells);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar células' });
    }
});

// Busca uma célula específica
router.get('/:id', async (req, res) => {
    try {
        const cell = await prisma.cell.findUnique({
            where: { id: req.params.id },
            include: {
                people: {
                    select: { id: true, name: true, phone: true }
                }
            }
        });
        if (!cell) return res.status(404).json({ error: 'Célula não encontrada' });
        res.json(cell);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar célula' });
    }
});

// Cadastra nova célula
router.post('/', async (req, res) => {
    const data = req.body;
    try {
        const cell = await prisma.cell.create({
            data: {
                name: data.name,
                leaderId: data.leaderId,
                viceLeaderId: data.viceLeaderId,
                hostId: data.hostId,
                address: data.address,
                meetingDay: data.meetingDay,
                meetingTime: data.meetingTime,
                status: data.status || 'ativa'
            }
        });
        res.status(201).json(cell);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar célula' });
    }
});

// Atualiza célula
router.put('/:id', async (req, res) => {
    const data = req.body;
    try {
        const cell = await prisma.cell.update({
            where: { id: req.params.id },
            data: {
                name: data.name,
                leaderId: data.leaderId,
                viceLeaderId: data.viceLeaderId,
                hostId: data.hostId,
                address: data.address,
                meetingDay: data.meetingDay,
                meetingTime: data.meetingTime,
                status: data.status
            }
        });
        res.json(cell);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar célula' });
    }
});

// Deleta célula
router.delete('/:id', async (req, res) => {
    try {
        // Ao deletar uma célula, removemos o vínculo de cellId das pessoas?
        // O Prisma pode estar configurado para Restrict ou Set Null.
        // Como está `references: [id]` padrão, é preferível atualizar as pessoas se o banco reclamar.

        await prisma.person.updateMany({
            where: { cellId: req.params.id },
            data: { cellId: null }
        });

        await prisma.cell.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar célula' });
    }
});

// ---------------------------------------------------------
// RELACIONADO À PRESENÇA DA CÉLULA (ATTENDANCE)
// ---------------------------------------------------------

// Buscar relatório de presenças (histórico de chamadas) da célula
router.get('/:id/attendance', async (req, res) => {
    try {
        const attendance = await prisma.attendance.findMany({
            where: { cellId: req.params.id },
            include: {
                records: {
                    include: { person: { select: { id: true, name: true } } }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar chamadas da célula' });
    }
});

// Lançar ou atualizar a chamada de um dia
router.post('/:id/attendance', async (req, res) => {
    // Corpo esperado: { date: "YYYY-MM-DD", notes: "", records: [{ personId: "id", status: "present/absent/excused" }] }
    const { date, notes, records } = req.body;
    const cellId = req.params.id;

    try {
        // Usa uma transação para deletar anterior e recriar se já existir (jeito simples de override no SQLite)
        const result = await prisma.$transaction(async (tx) => {
            // 1. Tenta deletar o Attendance existente naquele dia
            await tx.attendance.deleteMany({
                where: { cellId, date }
            });

            // 2. Cria o novo Attendance pai com seus Records
            const newAttendance = await tx.attendance.create({
                data: {
                    cellId,
                    date,
                    notes,
                    records: {
                        create: records.map(r => ({
                            personId: r.personId,
                            status: r.status
                        }))
                    }
                },
                include: { records: true }
            });

            return newAttendance;
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar chamada da célula' });
    }
});

// Toggle de cancelamento de uma célula para uma data específica
router.post('/:id/cancel', async (req, res) => {
    const { date, authorId } = req.body;
    const cellId = req.params.id;

    try {
        const existing = await prisma.cellCancellation.findUnique({
            where: { cellId_date: { cellId, date } }
        });

        if (existing) {
            // Desfaz o cancelamento
            await prisma.cellCancellation.delete({
                where: { cellId_date: { cellId, date } }
            });
            res.json({ canceled: false });
        } else {
            // Cria o cancelamento
            await prisma.cellCancellation.create({
                data: { cellId, date, authorId }
            });
            res.json({ canceled: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao alternar cancelamento da célula' });
    }
});

// Envia uma justificativa de não realização de célula
router.post('/:id/justify', async (req, res) => {
    const { date, reason, authorId } = req.body;
    const cellId = req.params.id;

    try {
        const justification = await prisma.cellJustification.create({
            data: { cellId, date, reason, authorId }
        });
        res.status(201).json(justification);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao justificar célula' });
    }
});

module.exports = router;
