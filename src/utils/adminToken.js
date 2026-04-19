const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ADMIN_TOKEN_EXPIRES_IN = '8h';

function signAdminToken(payload) {
  return jwt.sign(payload, env.ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_TOKEN_EXPIRES_IN,
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, env.ADMIN_JWT_SECRET);
}

module.exports = {
  signAdminToken,
  verifyAdminToken,
};
