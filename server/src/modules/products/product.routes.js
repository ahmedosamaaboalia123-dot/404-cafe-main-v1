import { Router } from 'express';
import { employeeAuth } from '../../platform/auth/employee-auth.middleware.js';
import { requirePermission } from '../../platform/auth/permission.middleware.js';
import { asyncHandler } from '../../platform/http/async-handler.js';
import { validate } from '../../platform/http/validate.middleware.js';
import { AUTH_PERMISSIONS } from '../../shared/constants/auth.constants.js';
import { createProductController } from './product.controller.js';
import {
  addonBody,
  catalogQuery,
  createCategoryBody,
  createProductBody,
  createSizeBody,
  createTypeBody,
  idParams,
  productsQuery,
  publicTopQuery,
  recipeBody,
  typeParams,
  updateCategoryBody,
  updateAddonBody,
  updateProductBody,
  updateSizeBody,
  updateTypeBody
} from './product.validation.js';
export function createProductRouter(d) {
  const r = Router(),
    c = createProductController(d);
  r.use(employeeAuth(d.config, d.authDependencies));
  r.get(
    '/products-screen',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_READ),
    validate({ query: productsQuery }),
    asyncHandler(c.screen)
  );
  r.post(
    '/product-categories',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ body: createCategoryBody }),
    asyncHandler(c.createCategory)
  );
  r.patch(
    '/product-categories/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: updateCategoryBody }),
    asyncHandler(c.updateCategory)
  );
  r.post(
    '/products',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ body: createProductBody }),
    asyncHandler(c.createProduct)
  );
  r.get(
    '/products/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_READ),
    validate({ params: idParams }),
    asyncHandler(c.details)
  );
  r.patch(
    '/products/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: updateProductBody }),
    asyncHandler(c.updateProduct)
  );
  r.delete(
    '/products/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams }),
    asyncHandler(c.deleteProduct)
  );
  r.post(
    '/products/:id/types',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: createTypeBody }),
    asyncHandler(c.createType)
  );
  r.patch(
    '/products/:id/types/:typeId',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: typeParams, body: updateTypeBody }),
    asyncHandler(c.updateType)
  );
  r.delete(
    '/products/:id/types/:typeId',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: typeParams }),
    asyncHandler(c.deleteType)
  );
  r.post(
    '/products/:id/sizes',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: createSizeBody }),
    asyncHandler(c.createSize)
  );
  r.post(
    '/products/:id/addons',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: addonBody }),
    asyncHandler(c.addon)
  );
  r.patch(
    '/product-addons/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: updateAddonBody }),
    asyncHandler(c.updateAddon)
  );
  r.put(
    '/product-sizes/:id/recipe',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: recipeBody }),
    asyncHandler(c.recipe)
  );
  r.patch(
    '/product-sizes/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams, body: updateSizeBody }),
    asyncHandler(c.updateSize)
  );
  r.delete(
    '/product-sizes/:id',
    requirePermission(AUTH_PERMISSIONS.PRODUCTS_MANAGE),
    validate({ params: idParams }),
    asyncHandler(c.deleteSize)
  );
  return r;
}
export function createCatalogRouter(d) {
  const r = Router(),
    c = createProductController(d);
  r.get('/catalog', validate({ query: catalogQuery }), asyncHandler(c.catalog));
  // Public best sellers: no employeeAuth, ids/names/quantities only.
  r.get(
    '/products/public/top',
    validate({ query: publicTopQuery }),
    asyncHandler(c.topProducts)
  );
  return r;
}
