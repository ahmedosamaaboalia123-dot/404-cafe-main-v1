/**
 * Whether a role is the system administrator.
 *
 * `name` is the only field the server sends in both the login and the bootstrap
 * response, so it is the reliable test. `level` is only present after bootstrap
 * (login omits it), and custom roles can be created at any level, so it is used
 * only as a secondary signal.
 *
 * Note: `shared/constants` exports `ROLE.ADMIN = 'admin'`, which is lowercase and
 * never matches the server's `'Admin'`. Do not use it for this check.
 */
export function isAdminRole(role) {
  if (!role) return false;
  return role.name === "Admin" || Number(role.level ?? 0) >= 100;
}
