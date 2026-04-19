const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const requireAdminAuth = require('../middlewares/adminAuth');
const {
  adminLogin,
  adminLogout,
  getAdminSession,
  getDashboard,
  updateSettingsHandler,
  listQuestionsByGender,
  createQuestionHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  reorderQuestionsHandler,
  listSubmissionsHandler,
  getSubmissionDetail,
  getLogs,
  getTelegramSettings,
  updateTelegramSettingsHandler,
  sendTelegramTest,
  uploadLogo,
  uploadBackground,
} = require('../controllers/adminController');

const router = express.Router();
const isVercelRuntime = process.env.VERCEL === '1';

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Cok fazla giris denemesi yaptiniz. Lutfen daha sonra tekrar deneyin.',
  },
});

let storage;
if (isVercelRuntime) {
  storage = multer.memoryStorage();
} else {
  const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
      const basename = path
        .basename(file.originalname || 'asset', ext)
        .replace(/[^a-zA-Z0-9-_]/g, '_');
      cb(null, `${Date.now()}-${basename}${ext}`);
    },
  });
}

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Sadece goruntu dosyalari yuklenebilir.'));
      return;
    }

    cb(null, true);
  },
});

router.post('/login', loginLimiter, asyncHandler(adminLogin));
router.post('/logout', requireAdminAuth, asyncHandler(adminLogout));
router.get('/session', requireAdminAuth, asyncHandler(getAdminSession));
router.get('/dashboard', requireAdminAuth, asyncHandler(getDashboard));

router.put('/settings', requireAdminAuth, asyncHandler(updateSettingsHandler));
router.get('/questions', requireAdminAuth, asyncHandler(listQuestionsByGender));
router.post('/questions', requireAdminAuth, asyncHandler(createQuestionHandler));
router.put('/questions/:questionId', requireAdminAuth, asyncHandler(updateQuestionHandler));
router.delete('/questions/:questionId', requireAdminAuth, asyncHandler(deleteQuestionHandler));
router.patch('/questions/reorder', requireAdminAuth, asyncHandler(reorderQuestionsHandler));

router.get('/submissions', requireAdminAuth, asyncHandler(listSubmissionsHandler));
router.get('/submissions/:submissionId', requireAdminAuth, asyncHandler(getSubmissionDetail));
router.get('/logs', requireAdminAuth, asyncHandler(getLogs));

router.get('/telegram-settings', requireAdminAuth, asyncHandler(getTelegramSettings));
router.put('/telegram-settings', requireAdminAuth, asyncHandler(updateTelegramSettingsHandler));
router.post('/telegram-test', requireAdminAuth, asyncHandler(sendTelegramTest));

router.post(
  '/assets/logo',
  requireAdminAuth,
  imageUpload.single('logo'),
  asyncHandler(uploadLogo)
);
router.post(
  '/assets/background',
  requireAdminAuth,
  imageUpload.single('background'),
  asyncHandler(uploadBackground)
);

module.exports = router;
