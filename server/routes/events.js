const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Listar todos os eventos e exceções
router.get('/', async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            include: {
                exceptions: true
            }
        });

        const cellCancellations = await prisma.cellCancellation.findMany();
        const cellJustifications = await prisma.cellJustification.findMany();

        res.json({ events, cellCancellations, cellJustifications });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

// Busca um evento por ID
router.get('/:id', async (req, res) => {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id },
            include: { exceptions: true }
        });
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
                reminder: data.reminder
            }
        });
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar evento' });
    }
});

// Atualiza evento
router.put('/:id', async (req, res) => {
    const data = req.body;
    try {
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
                reminder: data.reminder
            }
        });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
});

// Deleta evento
router.delete('/:id', async (req, res) => {
    try {
        await prisma.event.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar evento' });
    }
});

module.exports = router;
