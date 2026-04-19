const { verifySurveyToken } = require('../utils/surveyToken');

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return req.body?.surveyToken || req.query?.surveyToken || '';
}

function requireSurveySession(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Anket oturumu bulunamadi.',
    });
  }

  try {
    const payload = verifySurveyToken(token);
    req.surveySession = payload;
    req.surveyToken = token;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Anket oturumu gecersiz veya suresi dolmus.',
    });
  }
}

module.exports = requireSurveySession;
