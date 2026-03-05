const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Lista todas as células (com acesso a seus membros via rota específica)
router.get('/', async (req, res) => {
    try {
        const whereClause = {};
        if (req.user.role === 'LIDER_GERACAO') {
            if (!req.user.generationId) return res.json([]);
            whereClause.generationId = req.user.generationId;
        }

        const cells = await prisma.cell.findMany({
            where: whereClause,
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
        if (req.user.role === 'LIDER_GERACAO' && data.generationId && data.generationId !== req.user.generationId) {
            return res.status(403).json({ error: 'Você só pode criar células para a sua própria geração.' });
        }

        const cell = await prisma.cell.create({
            data: {
                name: data.name,
                leaderId: data.leaderId,
                viceLeaderId: data.viceLeaderId,
                hostId: data.hostId,
                address: data.address,
                meetingDay: data.meetingDay,
                meetingTime: data.meetingTime,
                status: data.status || 'ativa',
                generationId: data.generationId || null
            }
        });

        // Sincroniza Liderança
        if (data.leaderId) {
            await prisma.person.updateMany({ where: { userId: data.leaderId }, data: { cellId: cell.id } });
        }
        if (data.viceLeaderId) {
            await prisma.person.updateMany({ where: { userId: data.viceLeaderId }, data: { cellId: cell.id } });
        }

        res.status(201).json(cell);
        req.log?.('CREATE', 'cells', cell.id, cell.name);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar célula' });
    }
});

// Atualiza célula
router.put('/:id', async (req, res) => {
    const data = req.body;
    try {
        if (req.user.role === 'LIDER_GERACAO') {
            const existingCell = await prisma.cell.findUnique({ where: { id: req.params.id } });
            if (!existingCell || existingCell.generationId !== req.user.generationId) {
                return res.status(403).json({ error: 'Acesso negado: célula não pertence à sua geração.' });
            }
            if (data.generationId && data.generationId !== req.user.generationId) {
                return res.status(403).json({ error: 'Você não pode transferir a célula para outra geração.' });
            }
        }

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
                status: data.status,
                generationId: data.generationId || null
            }
        });

        // Sincroniza Liderança
        // Remove vínculo de quem não é mais líder dessa célula
        await prisma.person.updateMany({
            where: { cellId: cell.id, status: { in: ['Líder', 'Vice-Líder'] } },
            data: { cellId: null }
        });

        // Vincula os líderes atuais
        if (data.leaderId) {
            await prisma.person.updateMany({ where: { userId: data.leaderId }, data: { cellId: cell.id } });
        }
        if (data.viceLeaderId) {
            await prisma.person.updateMany({ where: { userId: data.viceLeaderId }, data: { cellId: cell.id } });
        }

        res.json(cell);
        req.log?.('UPDATE', 'cells', cell.id, cell.name);
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

        const cell = await prisma.cell.findUnique({ where: { id: req.params.id }, select: { name: true } });
        if (!cell) return res.status(404).json({ error: 'Célula não encontrada' });

        await prisma.person.updateMany({
            where: { cellId: req.params.id },
            data: { cellId: null }
        });

        await prisma.cell.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true });
        req.log?.('DELETE', 'cells', req.params.id, cell.name);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar célula' });
    }
});

// ---------------------------------------------------------
// RELACIONADO À PRESENÇA DA CÉLULA (ATTENDANCE)
// ---------------------------------------------------------

// Buscar TODAS as presenças (usado para relatórios)
router.get('/attendance/all', async (req, res) => {
    try {
        const whereClause = {};
        if (req.user.role === 'LIDER_GERACAO' && req.user.generationId) {
            whereClause.cell = { generationId: req.user.generationId };
        } else if (req.user.role === 'LEADER' || req.user.role === 'VICE_LEADER') {
            whereClause.cell = { OR: [{ leaderId: req.user.id }, { viceLeaderId: req.user.id }] };
        }

        const attendance = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                records: {
                    include: { person: { select: { id: true, name: true } } }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar todas as chamadas' });
    }
});

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
    // Corpo esperado: { date: "YYYY-MM-DD", notes: "", customFields: "{}", records: [{ personId: "id", status: "present/absent/excused" }] }
    const { date, notes, customFields, records } = req.body;
    const cellId = req.params.id;

    try {
        if (req.user.role === 'LIDER_GERACAO') {
            const cellInfo = await prisma.cell.findUnique({ where: { id: cellId } });
            if (!cellInfo || cellInfo.generationId !== req.user.generationId) {
                return res.status(403).json({ error: 'Célula não pertence a sua geração' });
            }
        }

        // Inteligência de merge: Se já existe um registro, mantemos o que não foi enviado agora
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.attendance.findUnique({
                where: { cellId_date: { cellId, date } },
                include: { records: true }
            });

            if (existing) {
                // Merge logic
                const finalNotes = notes !== undefined ? notes : existing.notes;
                const finalCustomFields = customFields !== undefined ? customFields : existing.customFields;

                // Se records for enviado (mesmo que vazio []), usamos o novo. 
                // Se for null/undefined (vindo do form de métricas puras), mantemos o antigo.
                const finalRecords = records !== undefined ? records : existing.records;

                // Deleta records antigos se houver novos registros de presença sendo enviados
                if (records !== undefined) {
                    await tx.attendanceRecord.deleteMany({ where: { attendanceId: existing.id } });
                }

                return await tx.attendance.update({
                    where: { id: existing.id },
                    data: {
                        notes: finalNotes,
                        customFields: finalCustomFields,
                        records: records !== undefined ? {
                            create: records.map(r => ({
                                personId: r.personId,
                                status: r.status
                            }))
                        } : undefined
                    },
                    include: { records: true }
                });
            } else {
                // Cria novo se não existia
                return await tx.attendance.create({
                    data: {
                        cellId,
                        date,
                        notes,
                        customFields,
                        records: {
                            create: (records || []).map(r => ({
                                personId: r.personId,
                                status: r.status
                            }))
                        }
                    },
                    include: { records: true }
                });
            }
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
