const express = require('express');
const router = express.Router();
const multer = require('multer');
const scanController = require('../controllers/scanController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many scans. Please wait a moment.' }
});

router.use(authenticateToken);

// POST /api/scan/food - Analyze food image
router.post('/food', scanLimiter, upload.single('image'), scanController.scanFood);

// POST /api/scan/food/base64 - Analyze food from base64 (camera capture)
router.post('/food/base64', scanLimiter, scanController.scanFoodBase64);

// GET /api/scan/history - Get scan history
router.get('/history', scanController.getScanHistory);

// DELETE /api/scan/:id - Delete a food log entry
router.delete('/:id', scanController.deleteFoodLog);

module.exports = router;
