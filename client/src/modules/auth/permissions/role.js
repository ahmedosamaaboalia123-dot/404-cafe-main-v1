/**
 * Whether a role is the system administrator.
 *
 * `name` is the only field the server sends in both the login and the bootstrap
 * response, so it is the reliable test. The level is deliberately ignored:
 * custom roles can use any level but must never gain administrator-only modules.
 *
 * Note: `shared/constants` exports `ROLE.ADMIN = 'admin'`, which is lowercase and
 * never matches the server's `'Admin'`. Do not use it for this check.
 */
export function isAdminRole(role) {
  if (!role) return false;
  return role.name === "Admin";
}
