require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();
const { createLog, activityLoggerMiddleware } = require('./middleware/activityLogger');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const path = require('path');
const fs = require('fs');

// Garante que a pasta de uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Pasta uploads criada com sucesso.');
}

app.use('/uploads', express.static(uploadsDir));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('ERRO: A variável de ambiente JWT_SECRET é obrigatória.');
    console.error('Recusando iniciar o servidor por razões de segurança.');
    process.exit(1);
}

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

    // Cria tabela SystemConfig se não existir (failsafe para migrações manuais)
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "SystemConfig" (
                "key" TEXT NOT NULL PRIMARY KEY,
                "value" TEXT NOT NULL,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) { /* já existe */ }

    // Seed da config padrão do dashboard
    const cfgKey = 'dashboardActions';
    const cfgDefault = JSON.stringify({
        noVisit: { enabled: true, days: 60 },
        baptism: { enabled: true },
        consolidation: { enabled: true, days: 15 },
        reconciliation: { enabled: true }
    });
    try {
        await prisma.$executeRawUnsafe(`
            INSERT OR IGNORE INTO "SystemConfig" ("key", "value", "updatedAt")
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `, cfgKey, cfgDefault);
    } catch (e) { /* já existe */ }

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "EventException" (
                "id"        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                "eventId"   TEXT NOT NULL,
                "date"      TEXT NOT NULL,
                "canceled"  INTEGER NOT NULL DEFAULT 0,
                "newTitle"  TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("eventId", "date")
            )
        `);
    } catch (e) { /* já existe */ }

    // Seed da config padrão de notificações
    const notifKey = 'notificationConfig';
    const notifDefault = JSON.stringify({
        newMember: { enabled: true },
        newEvent: { enabled: true },
        updatedEvent: { enabled: true },
        dailyReminder: { enabled: true }
    });
    try {
        await prisma.$executeRawUnsafe(`
            INSERT OR IGNORE INTO "SystemConfig" ("key", "value", "updatedAt")
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `, notifKey, notifDefault);
    } catch (e) { /* já existe */ }

    // Migração de tokenVersion para usuários antigos
    try {
        await prisma.user.updateMany({
            where: { tokenVersion: null },
            data: { tokenVersion: 0 }
        });
    } catch (e) { /* se a coluna não existir ainda, silencia */ }
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

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.sendStatus(403);
        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { role: true, generationId: true, tokenVersion: true }
            });

            if (!dbUser) return res.sendStatus(403);

            const dbVersion = dbUser.tokenVersion || 0;
            const tokenVersion = user.version || 0;

            if (dbVersion !== tokenVersion) {
                return res.sendStatus(403); // Token invalidado (senha trocada ou usuário removido)
            }

            user.role = dbUser.role;
            user.generationId = dbUser.generationId;
        } catch (error) {
            // Se falhar o DB, ainda deixamos passar se o token for válido e o payload estiver ok
        }
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

        if (!validPassword) {
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
            await createLog({ action: 'LOGIN_FAIL', resource: 'auth', detail: `Tentativa falha: ${username}`, ip });
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Gera o token limitando o payload
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            generationId: user.generationId,
            version: user.tokenVersion || 0
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Log de login bem-sucedido
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
        await createLog({ userId: user.id, userName: user.name, action: 'LOGIN', resource: 'auth', detail: user.username, ip });

        // Retorna o token e os dados essenciais (sem a senha)
        res.json({
            token,
            user: { id: user.id, name: user.name, username: user.username, role: user.role, avatar: user.avatar, generationId: user.generationId }
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
const { router: eventsRouter, notifyAllLeaders } = require('./routes/events');
const othersRouter = require('./routes/others');
const formsRouter = require('./routes/forms');
const generationsRouter = require('./routes/generations');
const settingsRouter = require('./routes/settings');
const { getNotificationConfig } = require('./routes/config');
const reportsRouter = require('./routes/reports');
const logsRouter = require('./routes/logs');

// API Pública v1 e gerenciamento admin
const apiV1Router = require('./api/routes/v1/index');
const apiKeysRouter = require('./api/routes/apiKeys');
const webhooksAdminRouter = require('./api/routes/webhooks');

app.use('/api/public/settings', settingsRouter);
app.use('/api/users', authenticateToken, activityLoggerMiddleware, usersRouter);
app.use('/api/people', authenticateToken, activityLoggerMiddleware, peopleRouter);
app.use('/api/cells', authenticateToken, activityLoggerMiddleware, cellsRouter);
app.use('/api/events', authenticateToken, activityLoggerMiddleware, eventsRouter);
app.use('/api/dash', authenticateToken, activityLoggerMiddleware, othersRouter);
app.use('/api/forms', authenticateToken, activityLoggerMiddleware, formsRouter);
app.use('/api/generations', authenticateToken, activityLoggerMiddleware, generationsRouter);
app.use('/api/settings', authenticateToken, activityLoggerMiddleware, settingsRouter);
app.use('/api/reports', authenticateToken, activityLoggerMiddleware, reportsRouter);
app.use('/api/logs', authenticateToken, logsRouter);

// ----------------------------------------------------------------------------
// API PÚBLICA v1 (autenticada por API Key) e Admin
// ----------------------------------------------------------------------------
app.use('/api/v1', apiV1Router);
app.use('/api/admin/api-keys', authenticateToken, apiKeysRouter);
app.use('/api/admin/webhooks', authenticateToken, webhooksAdminRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// ------------------------------------------------------------------
// JOB DIÁRIO: Lembrete de eventos de amanhã
// ------------------------------------------------------------------
async function scheduleDailyEventReminder() {
    const run = async () => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0]; // 'YYYY-MM-DD'

            const events = await prisma.event.findMany({
                where: { date: tomorrowStr, recurrence: 'none' }
            });

            // Eventos recorrentes que caem amanhã (weekly/monthly/yearly)
            const allEvents = await prisma.event.findMany({
                where: { date: { lte: tomorrowStr }, recurrence: { not: 'none' } }
            });
            const tomorrowDate = new Date(tomorrowStr + 'T12:00:00');
            const tomorrowDay = tomorrowDate.getDay(); // 0=Dom
            const tomorrowDD = tomorrowDate.getDate();
            const tomorrowMM = tomorrowDate.getMonth();

            allEvents.forEach(ev => {
                const evDate = new Date(ev.date + 'T12:00:00');
                let match = false;
                if (ev.recurrence === 'weekly' && evDate.getDay() === tomorrowDay) match = true;
                if (ev.recurrence === 'monthly-date' && evDate.getDate() === tomorrowDD) match = true;
                if (ev.recurrence === 'yearly' && evDate.getDate() === tomorrowDD && evDate.getMonth() === tomorrowMM) match = true;
                if (match) events.push(ev);
            });

            for (const ev of events) {
                const timeStr = ev.startTime ? ` às ${ev.startTime}` : '';
                const locationStr = ev.location ? ` — ${ev.location}` : '';
                // Evita notificação duplicada: só envia se não houver notif do mesmo título nas últimas 20h
                const recent = await prisma.notification.findFirst({
                    where: {
                        title: { contains: ev.title },
                        createdAt: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) }
                    }
                });
                if (!recent) {
                    const notifCfg = await getNotificationConfig();
                    if (notifCfg.dailyReminder?.enabled !== false) {
                        await notifyAllLeaders(
                            `⏰ Lembrete: ${ev.title} amanhã`,
                            `A programação "${ev.title}" acontece amanhã${timeStr}${locationStr}. Confirme a presença da sua célula!`,
                            `#/calendar`
                        );
                        console.log(`[Lembrete] Notificação enviada para: ${ev.title}`);
                    }
                }
            }
        } catch (e) {
            console.error('[scheduleDailyEventReminder] Erro:', e.message);
        }
    };

    // Roda AGORA e depois a cada 24h
    run();
    setInterval(run, 24 * 60 * 60 * 1000);
}

scheduleDailyEventReminder();

app.post('/api/settings/reset', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Só admins' });

        const fs = require('fs');
        const fsPath = require('path');

        // 1. Limpar arquivos físicos de upload
        const uploadsDir = fsPath.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file !== '.gitkeep') {
                    fs.unlinkSync(fsPath.join(uploadsDir, file));
                }
            }
        }

        // 2. Deletar tudo no banco em ordem de dependência
        await prisma.triageQueue.deleteMany();
        await prisma.form.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.personTrack.deleteMany();
        await prisma.track.deleteMany();
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
        await prisma.generation.deleteMany();
        await prisma.systemSettings.deleteMany();
        await prisma.systemConfig.deleteMany();
        await prisma.user.deleteMany(); // Apaga inclusive o admin atual

        // 3. Re-seed Admin e Configurações Padrão
        await seedAdmin();

        res.json({ success: true, message: 'Sistema reiniciado com sucesso.' });
    } catch (err) {
        console.error('Falha no Factory Reset', err);
        res.status(500).json({ error: 'Erro crítico interno no reset.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
