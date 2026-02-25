const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// ------------------------------------------------------------------
// FORMS
// ------------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const forms = await prisma.form.findMany();
        // Decode fields from JSON string back to array
        const processed = forms.map(f => ({
            ...f,
            fields: f.fields ? JSON.parse(f.fields) : []
        }));
        res.json(processed);
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar formulários' }); }
});

router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const form = await prisma.form.create({
            data: {
                name: body.name,
                status: body.status || 'ativo',
                showOnLogin: body.showOnLogin || false,
                icon: body.icon || 'description',
                color: body.color || 'blue',
                subtitle: body.subtitle || null,
                personStatus: body.personStatus || null,
                fields: JSON.stringify(body.fields || [])
            }
        });
        form.fields = JSON.parse(form.fields);
        res.status(201).json(form);
    } catch (err) { res.status(500).json({ error: 'Erro ao criar formulário' }); }
});

router.put('/:id', async (req, res) => {
    try {
        const body = req.body;
        const form = await prisma.form.update({
            where: { id: req.params.id },
            data: {
                name: body.name,
                status: body.status,
                showOnLogin: body.showOnLogin,
                icon: body.icon,
                color: body.color,
                subtitle: body.subtitle,
                personStatus: body.personStatus,
                fields: JSON.stringify(body.fields || [])
            }
        });
        form.fields = JSON.parse(form.fields);
        res.json(form);
    } catch (err) { res.status(500).json({ error: 'Erro ao atualizar formulário' }); }
});

router.delete('/:id', async (req, res) => {
    try {
        await prisma.form.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro ao excluir formulário' }); }
});

// ------------------------------------------------------------------
// TRIAGE
// ------------------------------------------------------------------
router.get('/triage/all', async (req, res) => {
    try {
        const triage = await prisma.triageQueue.findMany({
            orderBy: { createdAt: 'desc' },
            include: { form: true }
        });
        const processed = triage.map(t => ({
            ...t,
            data: t.data ? JSON.parse(t.data) : {},
            formName: t.form ? t.form.name : 'Formulário Excluído'
        }));
        res.json(processed);
    } catch (err) { res.status(500).json({ error: 'Erro ao buscar fila de triagem' }); }
});

router.post('/triage/new', async (req, res) => {
    try {
        const { formId, data } = req.body;
        const triage = await prisma.triageQueue.create({
            data: {
                formId,
                data: JSON.stringify(data || {})
            }
        });
        triage.data = JSON.parse(triage.data);
        res.status(201).json(triage);
    } catch (err) { res.status(500).json({ error: 'Erro ao criar item na triagem' }); }
});

router.put('/triage/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const triage = await prisma.triageQueue.update({
            where: { id: req.params.id },
            data: { status }
        });
        triage.data = JSON.parse(triage.data);
        res.json(triage);
    } catch (err) { res.status(500).json({ error: 'Erro ao atualizar triagem' }); }
});

router.delete('/triage/:id', async (req, res) => {
    try {
        await prisma.triageQueue.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erro ao remover da triagem' }); }
});

module.exports = router;
