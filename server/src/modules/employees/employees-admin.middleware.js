import { ApiError } from '../../platform/http/api-error.js';
import { Role } from './employee.models.js';

export function requireEmployeesModuleAdmin(dependencies = {}) {
  const RoleModel = dependencies.models?.Role ?? Role;
  return async function enforceEmployeesModuleAdmin(req, _res, next) {
    try {
      const roleId = req.auth?.roleIds?.[0];
      const role = roleId
        ? await RoleModel.findById(roleId).select('name level').lean()
        : null;
      if (role?.name !== 'Admin')
        throw new ApiError({
          code: 'EMPLOYEES_MODULE_ADMIN_ONLY',
          status: 403,
          messageAr: 'قسم الموظفين متاح لمدير النظام فقط'
        });
      next();
    } catch (error) {
      next(error);
    }
  };
}
