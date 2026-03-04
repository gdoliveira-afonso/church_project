const express = require('express');
const router = express.Router();
const { listKeys, createKey, revokeKey, deleteKey } = require('../controllers/apiKeysController');

router.get('/', listKeys);
router.post('/', createKey);
router.patch('/:id/revoke', revokeKey);
router.delete('/:id', deleteKey);

module.exports = router;
