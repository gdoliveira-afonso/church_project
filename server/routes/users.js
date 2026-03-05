const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const router = express.Router();
const prisma = new PrismaClient();

// Lista todos os usuários
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, username: true, role: true, avatar: true, generationId: true }
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
            select: { id: true, name: true, username: true, role: true, avatar: true, generationId: true }
        });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

// Cria usuário
router.post('/', async (req, res) => {
    const { name, username, password, role, avatar, generationId } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                username,
                password: hashedPassword,
                role: role || 'USER',
                avatar: avatar || null,
                generationId: generationId || null
            },
            select: { id: true, name: true, username: true, role: true, avatar: true, generationId: true }
        });

        // Se o usuário criado for um Líder ou Vice, cria o perfil correspondente na tabela de Pessoas
        if (user.role === 'LEADER' || user.role === 'VICE_LEADER') {
            await prisma.person.create({
                data: {
                    name: user.name,
                    status: user.role === 'LEADER' ? 'Líder' : 'Vice-Líder',
                    userId: user.id
                }
            });
        }

        res.status(201).json(user);
        req.log?.('CREATE', 'users', user.id, `${user.name} (${user.username})`);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Username já existe' });
        }
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Atualiza usuário
router.put('/:id', async (req, res) => {
    const { name, username, password, role, avatar, generationId } = req.body;
    const updateData = { name, username, role, avatar, generationId: generationId || null };

    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (password && existingUser) {
            updateData.tokenVersion = (existingUser.tokenVersion || 0) + 1;
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: { id: true, name: true, username: true, role: true, avatar: true, generationId: true }
        });
        res.json(user);
        req.log?.('UPDATE', 'users', user.id, `${user.name} (${user.username})`);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Alterar senha (com validação da senha atual)
router.put('/:id/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const targetId = req.params.id;

    // Apenas o próprio usuário ou um ADMIN pode trocar a senha
    if (req.user.id !== targetId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Sem permissão' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: targetId },
            data: {
                password: hashedPassword,
                tokenVersion: (user.tokenVersion || 0) + 1
            }
        });

        res.json({ success: true, message: 'Senha alterada com sucesso' });
        req.log?.('UPDATE', 'users', user.id, `Alterou senha de ${user.username}`);
    } catch (error) {
        console.error('Erro detalhado ao alterar senha:', error);
        res.status(500).json({ error: 'Erro ao alterar senha: ' + error.message });
    }
});

// Deleta usuário
router.delete('/:id', async (req, res) => {
    try {
        // Evita que o usuário delete a si mesmo (deve ser validado no frontend também)
        if (req.user && req.user.id === req.params.id) {
            return res.status(400).json({ error: 'Você não pode deletar a si mesmo' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        await prisma.user.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
        req.log?.('DELETE', 'users', req.params.id, `${user.name} (${user.username})`);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});

module.exports = router;
