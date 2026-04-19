const jwt = require('jsonwebtoken');
const env = require('../config/env');

const SURVEY_TOKEN_EXPIRES_IN = '45m';

function signSurveyToken(payload) {
  return jwt.sign(payload, env.PUBLIC_FLOW_JWT_SECRET, {
    expiresIn: SURVEY_TOKEN_EXPIRES_IN,
  });
}

function verifySurveyToken(token) {
  return jwt.verify(token, env.PUBLIC_FLOW_JWT_SECRET);
}

module.exports = {
  signSurveyToken,
  verifySurveyToken,
};
