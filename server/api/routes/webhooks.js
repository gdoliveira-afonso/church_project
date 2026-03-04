const express = require('express');
const router = express.Router();
const { listWebhooks, createWebhook, updateWebhook, deleteWebhook, getWebhookLogs, testWebhook } = require('../controllers/webhooksController');

router.get('/', listWebhooks);
router.post('/', createWebhook);
router.put('/:id', updateWebhook);
router.delete('/:id', deleteWebhook);
router.get('/:id/logs', getWebhookLogs);
router.post('/:id/test', testWebhook);

module.exports = router;
