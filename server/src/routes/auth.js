const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Signs a JWT containing the user's id and role.
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Returns a sanitised user object (no password_hash).
 */
function safeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

const { authenticateToken, requireRole } = require('../middleware/auth');

router.post(
  '/register',
  authenticateToken,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone is required')
      .matches(/^[0-9+\-\s()]{7,15}$/)
      .withMessage('Invalid phone number'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'staff', 'accountant', 'viewer'])
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, password, role } = req.body;

    try {
      // Check for existing user
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          phone,
          password_hash,
          role: role || 'staff',
        },
      });

      const token = signToken(user);

      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: safeUser(user),
      });
    } catch (err) {
      console.error('[register]', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;

    try {
      // Find user
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = signToken(user);

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: safeUser(user),
      });
    } catch (err) {
      console.error('[login]', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Protected route — returns the currently authenticated user

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: safeUser(user) });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
