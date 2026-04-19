const express = require('express');
const env = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'cift-uyum-yarismasi-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
