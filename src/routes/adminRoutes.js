const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const { requireAdminAuth } = require('../middlewares/adminAuth');
const {
  adminLogin,
  adminLogout,
  getAdminSessionInfo,
  getAdminSettings,
  patchAdminSettings,
  getAdminQuestions,
  createAdminQuestion,
  patchAdminQuestion,
  removeAdminQuestion,
  getAdminTeams,
  getAdminTeamParticipants,
  getAdminSubmissionDetail,
  removeAdminSubmission,
} = require('../controllers/adminController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Cok fazla giris denemesi yapildi. Lutfen bir sure bekleyin.',
  },
});

router.post('/login', loginLimiter, asyncHandler(adminLogin));
router.post('/logout', requireAdminAuth, asyncHandler(adminLogout));
router.get('/me', requireAdminAuth, asyncHandler(getAdminSessionInfo));

router.get('/settings', requireAdminAuth, asyncHandler(getAdminSettings));
router.patch('/settings', requireAdminAuth, asyncHandler(patchAdminSettings));

router.get('/questions', requireAdminAuth, asyncHandler(getAdminQuestions));
router.post('/questions', requireAdminAuth, asyncHandler(createAdminQuestion));
router.patch('/questions/:questionId', requireAdminAuth, asyncHandler(patchAdminQuestion));
router.delete('/questions/:questionId', requireAdminAuth, asyncHandler(removeAdminQuestion));
router.get('/teams', requireAdminAuth, asyncHandler(getAdminTeams));
router.get('/teams/:pairKey', requireAdminAuth, asyncHandler(getAdminTeamParticipants));
router.get('/submissions/:submissionId', requireAdminAuth, asyncHandler(getAdminSubmissionDetail));
router.delete(
  '/submissions/:submissionId',
  requireAdminAuth,
  asyncHandler(removeAdminSubmission)
);

module.exports = router;
