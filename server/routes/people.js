const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getNotificationConfig } = require('./config');

const router = express.Router();
const prisma = new PrismaClient();

// Listar todas as pessoas
router.get('/', async (req, res) => {
    try {
        let whereClause = {};
        if (req.user.role === 'LIDER_GERACAO') {
            if (!req.user.generationId) return res.json([]);
            const genCells = await prisma.cell.findMany({
                where: { generationId: req.user.generationId },
                select: { id: true }
            });
            whereClause.cellId = { in: genCells.map(c => c.id) };
        }

        const people = await prisma.person.findMany({
            where: whereClause,
            include: {
                cell: { select: { id: true, name: true } },
                consolidation: true,
                personTracks: true
            }
        });
        // Mapeia personTracks para o formato legaso objects tracksData { id: true }
        const processed = people.map(p => {
            const tracksData = {};
            if (p.personTracks) {
                p.personTracks.forEach(pt => tracksData[pt.trackId] = pt.completed);
            }
            delete p.personTracks;
            return { ...p, tracksData };
        });
        res.json(processed);
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

        const tracksData = {};
        if (person.personTracks) {
            person.personTracks.forEach(pt => tracksData[pt.trackId] = pt.completed);
        }
        person.tracksData = tracksData;

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
            prayerRequest: data.prayerRequest,
            cellId: data.cellId || null,
        };

        // Salva as trilhas marcadas no formulário (PersonTrack table)
        if (data.tracksData) {
            const tracks = Object.keys(data.tracksData).filter(tId => data.tracksData[tId]);
            if (tracks.length > 0) {
                createData.personTracks = {
                    create: tracks.map(tId => ({ trackId: tId, completed: true }))
                };
            }
        }

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
            const notifCfg = await getNotificationConfig();
            if (notifCfg.newMember?.enabled !== false) {
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
        }


        const resPerson = { ...person, tracksData: data.tracksData || {} };
        res.status(201).json(resPerson);
        req.log?.('CREATE', 'people', person.id, person.name);

        // ── Marcos iniciais ──
        if (createData.status && STATUS_MILESTONES[createData.status]) {
            const m = STATUS_MILESTONES[createData.status];
            await createMilestone(person.id, { type: m.type, label: m.label, icon: m.icon, color: m.color });
        } else {
            await createMilestone(person.id, { type: 'STATUS_CHANGE', label: 'Cadastrado no sistema', icon: 'person_add', color: 'blue' });
        }
        if (createData.cellId) {
            const cell = await prisma.cell.findUnique({ where: { id: createData.cellId }, select: { name: true } });
            await createMilestone(person.id, { type: 'CELL_CHANGE', label: 'Ingresso na Célula', detail: cell?.name, icon: 'groups', color: 'teal' });
        }
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
            include: { consolidation: true, personTracks: true }
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

        // Sincroniza as Trilhas (Apaga os velhos relacionamentos e subscreve pelos novos marcados)
        if (data.tracksData) {
            const tracks = Object.keys(data.tracksData).filter(tId => data.tracksData[tId]);
            updateData.personTracks = {
                deleteMany: {}, // Cleans old records safely cascade inside update
                create: tracks.map(tId => ({ trackId: tId, completed: true }))
            };
        }

        const person = await prisma.person.update({
            where: { id: req.params.id },
            data: updateData,
            include: { consolidation: true, personTracks: { include: { track: true } } }
        });

        // NOTIFICAÇÃO AO LÍDER (Se ele entrou numa célula nova agora)
        if (data.cellId && data.cellId !== existing.cellId) {
            const notifCfg = await getNotificationConfig();
            if (notifCfg.newMember?.enabled !== false) {
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
        }

        const resPerson = { ...person, tracksData: data.tracksData || {} };
        delete resPerson.personTracks;
        res.json(resPerson);
        req.log?.('UPDATE', 'people', req.params.id, person.name);

        // ── Marcos automáticos no update ──
        const today = new Date();
        // 1. Mudança de status
        if (data.status && data.status !== existing.status && STATUS_MILESTONES[data.status]) {
            const m = STATUS_MILESTONES[data.status];
            await createMilestone(req.params.id, {
                type: m.type, label: m.label, icon: m.icon, color: m.color,
                detail: `Anterior: ${existing.status}`, date: today
            });
        }
        // 2. Troca de célula
        if (data.cellId && data.cellId !== existing.cellId) {
            const newCell = await prisma.cell.findUnique({ where: { id: data.cellId }, select: { name: true } });
            const oldCell = existing.cellId ? await prisma.cell.findUnique({ where: { id: existing.cellId }, select: { name: true } }) : null;
            await createMilestone(req.params.id, {
                type: 'CELL_CHANGE', label: 'Transferência de Célula',
                icon: 'swap_horiz', color: 'blue',
                detail: oldCell ? `${oldCell.name} → ${newCell?.name}` : newCell?.name,
                date: today
            });
        }
        // 3. Novos tracks marcados
        if (data.tracksData) {
            const oldTrackIds = new Set((existing.personTracks || []).map(pt => pt.trackId));
            const newMarked = Object.keys(data.tracksData).filter(tid => data.tracksData[tid] && !oldTrackIds.has(tid));
            if (newMarked.length) {
                const tracks = await prisma.track.findMany({ where: { id: { in: newMarked } } });
                for (const track of tracks) {
                    await createMilestone(req.params.id, {
                        type: 'TRACK_COMPLETED', label: track.name,
                        icon: track.icon || 'star', color: track.color || 'emerald',
                        date: today
                    });
                }
            }
        }
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
        req.log?.('DELETE', 'people', req.params.id);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar pessoa' });
    }
});

// ─── Milestones helpers ────────────────────────────────────────
const STATUS_MILESTONES = {
    'Novo Convertido': { label: 'Decisão de Fé', icon: 'favorite', color: 'emerald', type: 'STATUS_CHANGE' },
    'Membro': { label: 'Tornou-se Membro', icon: 'verified', color: 'primary', type: 'STATUS_CHANGE' },
    'Reconciliação': { label: 'Reconciliação', icon: 'handshake', color: 'purple', type: 'STATUS_CHANGE' },
    'Líder': { label: 'Líder de Célula', icon: 'shield_person', color: 'indigo', type: 'ROLE_CHANGE' },
    'Vice-Líder': { label: 'Vice-Líder de Célula', icon: 'supervisor_account', color: 'cyan', type: 'ROLE_CHANGE' },
    'Inativo': { label: 'Ficou Inativo', icon: 'person_off', color: 'gray', type: 'STATUS_CHANGE' },
    'Afastado': { label: 'Afastado', icon: 'person_remove', color: 'orange', type: 'STATUS_CHANGE' },
    'Mudou-se': { label: 'Mudou de Cidade', icon: 'moving', color: 'slate', type: 'STATUS_CHANGE' },
};

async function createMilestone(personId, data) {
    try {
        await prisma.personMilestone.create({ data: { personId, ...data } });
    } catch (e) { console.error('Erro ao criar marco:', e.message); }
}

// Busca milestones de uma pessoa
router.get('/:id/milestones', async (req, res) => {
    try {
        const milestones = await prisma.personMilestone.findMany({
            where: { personId: req.params.id },
            orderBy: { date: 'desc' }
        });
        res.json(milestones);
    } catch (e) { res.status(500).json({ error: 'Erro ao buscar marcos' }); }
});

// Marco manual
router.post('/:id/milestones', async (req, res) => {
    try {
        const m = await prisma.personMilestone.create({
            data: {
                personId: req.params.id,
                type: 'MANUAL',
                label: req.body.label,
                detail: req.body.detail || null,
                icon: req.body.icon || 'star',
                color: req.body.color || 'amber',
            }
        });
        res.status(201).json(m);
    } catch (e) { res.status(500).json({ error: 'Erro ao criar marco' }); }
});

module.exports = router;
