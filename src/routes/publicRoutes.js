const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const requireSurveySession = require('../middlewares/surveyAuth');
const {
  getPublicSettings,
  createSurveySession,
  getSurveyQuestions,
  submitSurvey,
} = require('../controllers/publicController');

const router = express.Router();
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Cok fazla istek gonderildi. Lutfen bir sure sonra tekrar deneyin.',
  },
});

router.get('/settings', asyncHandler(getPublicSettings));
router.post('/session', asyncHandler(createSurveySession));
router.get('/questions', requireSurveySession, asyncHandler(getSurveyQuestions));
router.post(
  '/submissions',
  submissionLimiter,
  requireSurveySession,
  asyncHandler(submitSurvey)
);

module.exports = router;
