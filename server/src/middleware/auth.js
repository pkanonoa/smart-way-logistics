const jwt = require('jsonwebtoken');

// ─── authenticateToken ────────────────────────────────────────────────────────
/**
 * Middleware that verifies the JWT in the Authorization header.
 * On success, attaches `req.user = { id, role, name }` to the request.
 *
 * Usage:
 *   router.get('/protected', authenticateToken, handler)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
}

// ─── requireRole ──────────────────────────────────────────────────────────────
/**
 * Middleware factory that restricts access to specific roles.
 * Must be used AFTER authenticateToken.
 *
 * Usage:
 *   router.get('/admin-only', authenticateToken, requireRole('admin'), handler)
 *   router.get('/multi-role', authenticateToken, requireRole('admin', 'accountant'), handler)
 *
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'staff', 'accountant')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    // A viewer is a read-only role: they can access ALL GET routes, but cannot do POST/PUT/DELETE
    if (req.user.role === 'viewer') {
      if (req.method === 'GET') {
        return next();
      } else {
        return res.status(403).json({ error: 'Access denied. View-only access allowed for viewers.' });
      }
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = { authenticateToken, requireRole };
