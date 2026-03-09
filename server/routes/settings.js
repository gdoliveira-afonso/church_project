const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Inicia as configurações padrão se não existirem
async function getOrCreateSettings() {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                appName: 'Gestão Celular',
                primaryColor: '#0f172a',
                logoUrl: '',
                loginMessage: 'Transformando o cuidado pastoral e gestão de células em uma experiência simples e poderosa.'
            }
        });
    }
    return settings;
}

// Helper: get cellCustomFields via SystemConfig table (bypasses stale Prisma client mapping to SystemSettings)
async function getRawCellCustomFields() {
    try {
        const config = await prisma.systemConfig.findUnique({ where: { key: 'cellCustomFields' } });
        return config ? config.value : '';
    } catch (e) { return ''; }
}

async function saveRawCellCustomFields(value) {
    try {
        await prisma.systemConfig.upsert({
            where: { key: 'cellCustomFields' },
            update: { value: value || '' },
            create: { key: 'cellCustomFields', value: value || '' }
        });
        return true;
    } catch (e) {
        console.error('Error saving raw cell fields:', e);
        return false;
    }
}

// ROTA PÚBLICA: GET /api/public/settings
// Usada na tela de login e boot inicial do sistema
router.get('/public', async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        // Load custom fields from dedicated SystemConfig table
        const cellCustomFields = await getRawCellCustomFields();
        res.json({ ...settings, cellCustomFields });
    } catch (error) {
        console.error("Erro ao buscar configurações públicas:", error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// ROTA PÚBLICA: GET /api/public/settings/manifest.json
router.get('/manifest.json', async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        const appName = settings.appName || 'Gestão Celular';
        const logoUrl = settings.logoUrl || '';

        const manifest = {
            name: appName,
            short_name: appName,
            description: settings.loginMessage || 'Sistema de Gestão Celular',
            start_url: '/',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#ffffff',
            theme_color: settings.primaryColor || '#0f172a',
            icons: []
        };

        if (logoUrl) {
            manifest.icons.push({
                src: logoUrl,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
            });
            manifest.icons.push({
                src: logoUrl,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
            });
        }

        res.json(manifest);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar manifesto' });
    }
});

// ROTA PRIVADA: PUT /api/settings
router.put('/', async (req, res) => {
    try {
        const { appName, primaryColor, logoUrl, loginMessage, congregationName, congregationAddress, pastorName, nucleus, cellCustomFields } = req.body;
        console.log('[Settings PUT] Received cellCustomFields:', cellCustomFields);

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const currentSettings = await getOrCreateSettings();

        const updated = await prisma.systemSettings.update({
            where: { id: currentSettings.id },
            data: {
                appName: appName !== undefined ? appName : currentSettings.appName,
                primaryColor: primaryColor !== undefined ? primaryColor : currentSettings.primaryColor,
                logoUrl: logoUrl !== undefined ? logoUrl : currentSettings.logoUrl,
                loginMessage: loginMessage !== undefined ? loginMessage : currentSettings.loginMessage,
                congregationName: congregationName !== undefined ? congregationName : currentSettings.congregationName,
                congregationAddress: congregationAddress !== undefined ? congregationAddress : currentSettings.congregationAddress,
                pastorName: pastorName !== undefined ? pastorName : currentSettings.pastorName,
                nucleus: nucleus !== undefined ? nucleus : currentSettings.nucleus,
                // cellCustomFields is ignored here as we use SystemConfig
            }
        });

        // Save cellCustomFields via SystemConfig
        if (cellCustomFields !== undefined) {
            await saveRawCellCustomFields(cellCustomFields);
            console.log('[Settings PUT] cellCustomFields saved to SystemConfig:', cellCustomFields);
        }

        const savedCellCustomFields = await getRawCellCustomFields();
        res.json({ ...updated, cellCustomFields: savedCellCustomFields });
    } catch (error) {
        console.error("Erro ao atualizar configurações:", error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

// ROTAS DEDICADAS para campos customizados
router.get('/cell-fields', async (req, res) => {
    try {
        const value = await getRawCellCustomFields();
        res.json({ cellCustomFields: value });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar campos' });
    }
});

router.put('/cell-fields', async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { cellCustomFields } = req.body;
        await saveRawCellCustomFields(cellCustomFields);
        res.json({ cellCustomFields });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar campos' });
    }
});

const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const fs = require('fs');
        const uploadPath = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// ROTA PRIVADA: POST /api/settings/upload-logo
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (error) {
        console.error("Erro no upload da logo:", error);
        res.status(500).json({ error: 'Erro interno no upload' });
    }
});

module.exports = router;
