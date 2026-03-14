const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', profileController.getProfile);
router.post('/save', [
  body('age').optional().isInt({ min: 1, max: 150 }),
  body('height').optional().isFloat({ min: 50, max: 300 }),
  body('weight').optional().isFloat({ min: 20, max: 500 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('activity_level').optional().isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']),
  body('diet_goal').optional().isIn(['weight_loss', 'muscle_gain', 'maintenance', 'health']),
], profileController.saveProfile);

module.exports = router;
