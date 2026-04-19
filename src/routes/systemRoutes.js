const express = require('express');
const env = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  const bootstrapError = _req.app?.locals?.bootstrapError || '';
  res.json({
    success: true,
    service: 'cift-uyum-yarismasi-api',
    environment: env.NODE_ENV,
    degraded: Boolean(bootstrapError),
    bootstrapError,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
