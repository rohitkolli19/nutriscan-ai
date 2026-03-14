const express = require('express');
const router = express.Router();
const multer = require('multer');
const menuController = require('../controllers/menuController');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.use(authenticateToken);
router.post('/scan', upload.single('image'), menuController.scanMenu);
router.post('/scan/base64', menuController.scanMenuBase64);
router.get('/history', menuController.getMenuHistory);

module.exports = router;
