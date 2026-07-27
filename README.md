# Smart Way Logistics

A full-stack logistics management platform.

## Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| Frontend   | React (Vite) + Tailwind CSS v4       |
| Backend    | Node.js + Express.js                 |
| Database   | PostgreSQL via Prisma ORM            |
| Auth       | JWT with role-based access control   |

## Project Structure

```
/
├── client/             # React frontend (Vite)
│   └── src/
│       ├── api/        # Axios API helpers
│       ├── components/ # Reusable components (ProtectedRoute, etc.)
│       ├── context/    # AuthContext
│       └── pages/      # LoginPage, DashboardPage
│
├── server/             # Express backend
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── lib/        # Prisma singleton
│       ├── middleware/ # JWT auth middleware
│       └── routes/     # auth.js
│
└── package.json        # Root workspace
```

## Getting Started

### 1. Configure the database

```bash
cp server/.env.example server/.env
# Edit server/.env — set DATABASE_URL to your PostgreSQL connection string
```

### 2. Run Prisma migrations

```bash
cd server
npm run db:push       # push schema to DB (dev)
# or
npm run db:migrate    # create and apply a migration
```

### 3. Start development servers

From the project root:
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

### 4. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","phone":"+919876543210","password":"password123","role":"admin"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","password":"password123"}'
```

## Auth Roles

| Role        | Description                  |
|-------------|------------------------------|
| `admin`     | Full system access           |
| `staff`     | Operations access            |
| `accountant`| Financial access             |
| `viewer`    | Read-only (GET requests only)|

## Protecting Routes (backend)

```js
const { authenticateToken, requireRole } = require('./middleware/auth');

// Any authenticated user
router.get('/resource', authenticateToken, handler);

// Admin only
router.delete('/resource/:id', authenticateToken, requireRole('admin'), handler);

// Admin or accountant
router.get('/reports', authenticateToken, requireRole('admin', 'accountant'), handler);
```
