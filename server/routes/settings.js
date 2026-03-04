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

// ROTA PÚBLICA: GET /api/public/settings
// Usada na tela de login e boot inicial do sistema
router.get('/public', async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        res.json(settings);
    } catch (error) {
        console.error("Erro ao buscar configurações públicas:", error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// Middleware de Autenticação para a rota PUT abaixo (como ela não faz parte do index global da mesma forma, 
// o index.js injetará mas vamos confiar no token validado lá)

// ROTA PRIVADA: PUT /api/settings
router.put('/', async (req, res) => {
    try {
        const { appName, primaryColor, logoUrl, loginMessage, congregationName, congregationAddress, pastorName, nucleus } = req.body;

        // Verifica permissão (apenas ADMIN pode alterar isso)
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const currentSettings = await getOrCreateSettings();

        const updated = await prisma.systemSettings.update({
            where: { id: currentSettings.id },
            data: {
                appName: appName || "Gestão Celular",
                primaryColor: primaryColor || "#0f172a",
                logoUrl: logoUrl !== undefined ? logoUrl : currentSettings.logoUrl,
                loginMessage: loginMessage !== undefined ? loginMessage : currentSettings.loginMessage,
                congregationName: congregationName !== undefined ? congregationName : currentSettings.congregationName,
                congregationAddress: congregationAddress !== undefined ? congregationAddress : currentSettings.congregationAddress,
                pastorName: pastorName !== undefined ? pastorName : currentSettings.pastorName,
                nucleus: nucleus !== undefined ? nucleus : currentSettings.nucleus,
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Erro ao atualizar configurações:", error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads'));
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
