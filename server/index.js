require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key'; // Mudar em produção

// Seed inicial para o Admin (se não existir)
async function seedAdmin() {
    const adminExists = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await prisma.user.create({
            data: {
                name: 'Administrador',
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });
        console.log('Usuário admin criado (admin/123456)');
    }

    // Seed inicial para Trilhas
    const defaultTracks = [
        { id: 't-waterBaptism', name: 'Batismo nas Águas', category: 'espiritual', icon: 'water_drop', color: 'blue' },
        { id: 't-holySpiritBaptism', name: 'Batismo com o Espírito Santo', category: 'espiritual', icon: 'local_fire_department', color: 'orange' },
        { id: 't-leadersSchool', name: 'Escola de Líderes', category: 'espiritual', icon: 'school', color: 'purple' },
        { id: 't-encounter', name: 'Encontro com Deus', category: 'retiros', icon: 'volunteer_activism', color: 'emerald' }
    ];

    for (const dt of defaultTracks) {
        const exist = await prisma.track.findUnique({ where: { id: dt.id } });
        if (!exist) {
            await prisma.track.create({ data: dt });
        }
    }
}

// Inicializa a seed
seedAdmin().catch(console.error);

// ----------------------------------------------------------------------------
// MIDDLEWARE DE AUTENTICAÇÃO
// ----------------------------------------------------------------------------
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// ----------------------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO
// ----------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

        // Verifica a senha se não for hash (para compatibilidade caso crie manual) ou com bcrypt
        let validPassword = false;
        if (user.password === password) { // Senha plana
            validPassword = true;
            // Ideal seria atualizar o hash aqui, mas vamos seguir
        } else {
            validPassword = await bcrypt.compare(password, user.password);
        }

        if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

        // Gera o token limitando o payload
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Retorna o token e os dados essenciais (sem a senha)
        res.json({
            token,
            user: { id: user.id, name: user.name, username: user.username, role: user.role, avatar: user.avatar }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// ----------------------------------------------------------------------------
// ROTAS PÚBLICAS (Visitantes e Formulários)
// ----------------------------------------------------------------------------
app.get('/api/public/forms', async (req, res) => {
    try {
        const forms = await prisma.form.findMany({
            where: { status: 'ativo', showOnLogin: true }
        });
        const processed = forms.map(f => ({
            ...f,
            fields: f.fields ? JSON.parse(f.fields) : []
        }));
        res.json(processed);
    } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.get('/api/public/forms/:id', async (req, res) => {
    try {
        const form = await prisma.form.findUnique({ where: { id: req.params.id, status: 'ativo' } });
        if (!form) return res.status(404).json({ error: 'Formulário não encontrado' });
        form.fields = JSON.parse(form.fields);
        res.json(form);
    } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.post('/api/public/triage', async (req, res) => {
    try {
        const { formId, data } = req.body;
        const triage = await prisma.triageQueue.create({
            data: { formId, data: JSON.stringify(data || {}) }
        });
        res.status(201).json(triage);
    } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

// ----------------------------------------------------------------------------
// ROTAS GENÉRICAS E COMPONENTES
// ----------------------------------------------------------------------------

const usersRouter = require('./routes/users');
const peopleRouter = require('./routes/people');
const cellsRouter = require('./routes/cells');
const eventsRouter = require('./routes/events');
const othersRouter = require('./routes/others');
const formsRouter = require('./routes/forms');

app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/people', authenticateToken, peopleRouter);
app.use('/api/cells', authenticateToken, cellsRouter);
app.use('/api/events', authenticateToken, eventsRouter);
app.use('/api/dash', authenticateToken, othersRouter);
app.use('/api/forms', authenticateToken, formsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

app.post('/api/settings/reset', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Só admins' });

        // Deletar dependências filhas primeiro para evitar relacional
        await prisma.triageQueue.deleteMany();
        await prisma.form.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.personTrack.deleteMany(); // Reseta status de todos os membros nas trilhas

        // Deleta todas as trilhas EXCETO as padrões
        await prisma.track.deleteMany({
            where: {
                id: { notIn: ['t-waterBaptism', 't-holySpiritBaptism', 't-leadersSchool', 't-encounter'] }
            }
        });

        await prisma.cellJustification.deleteMany();
        await prisma.cellCancellation.deleteMany();
        await prisma.eventException.deleteMany();
        await prisma.event.deleteMany();
        await prisma.visit.deleteMany();
        await prisma.pastoralNote.deleteMany();
        await prisma.attendanceRecord.deleteMany();
        await prisma.attendance.deleteMany();
        await prisma.consolidation.deleteMany();
        await prisma.person.deleteMany();
        await prisma.cell.deleteMany();

        await prisma.user.deleteMany({
            where: { username: { not: 'admin' } }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Falha no Factory Reset', err);
        res.status(500).json({ error: 'Erro crítico interno.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
