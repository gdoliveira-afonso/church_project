const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const router = express.Router();
const prisma = new PrismaClient();

// Lista todos os usuários
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, username: true, role: true, avatar: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// Busca um usuário
router.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, name: true, username: true, role: true, avatar: true }
        });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

// Cria usuário
router.post('/', async (req, res) => {
    const { name, username, password, role, avatar } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                username,
                password: hashedPassword,
                role: role || 'USER',
                avatar
            },
            select: { id: true, name: true, username: true, role: true, avatar: true }
        });
        res.status(201).json(user);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Username já existe' });
        }
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Atualiza usuário
router.put('/:id', async (req, res) => {
    const { name, username, password, role, avatar } = req.body;
    const updateData = { name, username, role, avatar };

    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: { id: true, name: true, username: true, role: true, avatar: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Deleta usuário
router.delete('/:id', async (req, res) => {
    try {
        // Evita que o usuário delete a si mesmo (deve ser validado no frontend também)
        if (req.user && req.user.id === req.params.id) {
            return res.status(400).json({ error: 'Você não pode deletar a si mesmo' });
        }

        await prisma.user.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});

module.exports = router;
