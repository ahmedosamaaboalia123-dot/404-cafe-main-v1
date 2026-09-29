import { normalizePermissions } from "../adapters/auth.adapter";
export function permissionKeys(permissions) {
  const result = new Set();
  for (const entry of normalizePermissions(permissions)) {
    if (!entry.visible) continue;
    result.add(entry.pageKey);
    entry.actions.forEach((action) => result.add(`${entry.pageKey}.${action}`));
  }
  return result;
}
export function can(permissions, permission) {
  if (!permission) return true;
  const keys = permissionKeys(permissions);
  return keys.has("*") || keys.has(permission);
}
export const canAny = (permissions, required = []) => required.some((permission) => can(permissions, permission));
export const canAll = (permissions, required = []) => required.every((permission) => can(permissions, permission));
export const canSeePage = (permissions, pageKey) => can(permissions, pageKey);
