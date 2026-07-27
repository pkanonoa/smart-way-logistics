const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');

const router = express.Router();

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone/Username is required')
      .isLength({ min: 4 })
      .withMessage('Phone/Username must be at least 4 characters long'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['admin', 'staff', 'accountant', 'viewer'])
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, password, role } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          phone,
          password_hash,
          role,
        },
      });

      const { password_hash: _, ...safeUser } = user;
      return res.status(201).json({
        message: 'User created successfully',
        user: safeUser,
      });
    } catch (err) {
      console.error('[users:create]', err);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        created_at: true,
      }
    });
    return res.status(200).json({ users });
  } catch (err) {
    console.error('[users:list]', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('[users:delete]', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
