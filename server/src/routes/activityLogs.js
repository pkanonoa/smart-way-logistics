const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/activity-logs
router.get('/', async (req, res) => {
  try {
    const { module: moduleName, recordId } = req.query;
    const where = {};
    if (moduleName) where.module = moduleName;
    if (recordId) where.record_id = recordId;

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    res.json({ logs });
  } catch (err) {
    console.error('[ActivityLogs:get]', err);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

module.exports = router;
