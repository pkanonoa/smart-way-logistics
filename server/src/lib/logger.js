const prisma = require('./prisma');

async function logActivity(req, moduleName, action, recordId, description) {
  try {
    const userId = req.user?.id || null;
    const userName = req.user?.name || null;
    await prisma.activityLog.create({
      data: {
        module: moduleName,
        action,
        record_id: recordId,
        description,
        user_id: userId,
        user_name: userName,
      }
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

module.exports = { logActivity };
