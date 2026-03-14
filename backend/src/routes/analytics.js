const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/daily', analyticsController.getDailyAnalytics);
router.get('/weekly', analyticsController.getWeeklyAnalytics);
router.get('/monthly', analyticsController.getMonthlyAnalytics);
router.get('/summary', analyticsController.getSummary);
router.post('/log', analyticsController.logActivity);
router.get('/insights', analyticsController.getAIInsights);

module.exports = router;
