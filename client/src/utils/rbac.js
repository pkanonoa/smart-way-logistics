// ─── RBAC Utilities ──────────────────────────────────────────────────────────
// Single source of truth for role-based access checks on the frontend.
// The canonical role list matches the Prisma Role enum.

export const ROLES = ['admin', 'accountant', 'staff', 'viewer'];

/**
 * Returns true if the user's role is in the provided list.
 * @param {object|null} user  - auth context user ({ id, name, role })
 * @param {...string}   roles - allowed roles (e.g. 'admin', 'staff')
 */
export function hasRole(user, ...roles) {
  return !!user && roles.includes(user.role);
}

/**
 * Returns true if the user can perform write operations (i.e. not a viewer).
 */
export function canWrite(user) {
  return !!user && user.role !== 'viewer';
}

/**
 * Returns true if the user is an admin.
 */
export function isAdmin(user) {
  return !!user && user.role === 'admin';
}
