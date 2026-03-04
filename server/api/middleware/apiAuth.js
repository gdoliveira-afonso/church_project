const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();

// Rate limiter: 100 req/min por keyPrefix
const apiRateLimiters = new Map();

function getRateLimiter(keyPrefix) {
    if (!apiRateLimiters.has(keyPrefix)) {
        apiRateLimiters.set(keyPrefix, rateLimit({
            windowMs: 60 * 1000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false,
            message: { success: false, error: 'Rate limit excedido. Máximo 100 requisições por minuto.' },
            keyGenerator: () => keyPrefix,
        }));
    }
    return apiRateLimiters.get(keyPrefix);
}

async function apiAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'API key ausente. Use: Authorization: Bearer <sua_api_key>' });
    }

    const providedKey = authHeader.split(' ')[1];

    try {
        // Busca todas as chaves ativas
        const activeKeys = await prisma.apiKey.findMany({ where: { status: 'active' } });

        let matchedKey = null;
        for (const apiKey of activeKeys) {
            const valid = await bcrypt.compare(providedKey, apiKey.keyHash);
            if (valid) {
                matchedKey = apiKey;
                break;
            }
        }

        if (!matchedKey) {
            return res.status(401).json({ success: false, error: 'API key inválida ou revogada.' });
        }

        // Aplica rate limit específico desta chave
        const limiter = getRateLimiter(matchedKey.keyPrefix);
        limiter(req, res, async () => {
            // Atualiza lastUsedAt de forma assíncrona (não bloqueia resposta)
            prisma.apiKey.update({
                where: { id: matchedKey.id },
                data: { lastUsedAt: new Date() }
            }).catch(() => { });

            req.apiKey = matchedKey;
            req.apiPermissions = matchedKey.permissions.split(',').map(p => p.trim());
            next();
        });
    } catch (error) {
        console.error('[apiAuth] Erro:', error.message);
        res.status(500).json({ success: false, error: 'Erro interno de autenticação.' });
    }
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.apiPermissions || !req.apiPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                error: `Permissão '${permission}' necessária para este endpoint.`
            });
        }
        next();
    };
}

module.exports = { apiAuth, requirePermission };
