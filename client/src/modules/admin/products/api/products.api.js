import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const PRODUCT_ENDPOINTS = Object.freeze({
  screen: "/products-screen",
  categories: "/product-categories",
  categoryDetails: (id) => `/product-categories/${encodeURIComponent(id)}`,
  create: "/products",
  details: (id) => `/products/${encodeURIComponent(id)}`,
  types: (id) => `/products/${encodeURIComponent(id)}/types`,
  typeDetails: (id, typeId) => `/products/${encodeURIComponent(id)}/types/${encodeURIComponent(typeId)}`,
  sizes: (id) => `/products/${encodeURIComponent(id)}/sizes`,
  sizeDetails: (id) => `/product-sizes/${encodeURIComponent(id)}`,
  addons: (id) => `/products/${encodeURIComponent(id)}/addons`,
  addonDetails: (id) => `/product-addons/${encodeURIComponent(id)}`,
  recipe: (id) => `/product-sizes/${encodeURIComponent(id)}/recipe`,
  catalog: "/catalog",
});

export const productsApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(PRODUCT_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async createCategory(body, idempotencyKey) { return unwrapData(await v1Client.post(PRODUCT_ENDPOINTS.categories, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async updateCategory(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(PRODUCT_ENDPOINTS.categoryDetails(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async create(body, idempotencyKey) { return unwrapData(await v1Client.post(PRODUCT_ENDPOINTS.create, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async details(id) { return unwrapData(await v1Client.get(PRODUCT_ENDPOINTS.details(id))); },
  async update(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(PRODUCT_ENDPOINTS.details(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async createType(id, body, idempotencyKey) { return unwrapData(await v1Client.post(PRODUCT_ENDPOINTS.types(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async updateType(id, typeId, body, idempotencyKey) { return unwrapData(await v1Client.patch(PRODUCT_ENDPOINTS.typeDetails(id, typeId), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async deleteType(id, typeId, idempotencyKey) { return unwrapData(await v1Client.delete(PRODUCT_ENDPOINTS.typeDetails(id, typeId), { headers: operationHeaders({ idempotencyKey }) })); },
  async createSize(id, body, idempotencyKey) { return unwrapData(await v1Client.post(PRODUCT_ENDPOINTS.sizes(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async updateSize(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(PRODUCT_ENDPOINTS.sizeDetails(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async deleteSize(id, idempotencyKey) { return unwrapData(await v1Client.delete(PRODUCT_ENDPOINTS.sizeDetails(id), { headers: operationHeaders({ idempotencyKey }) })); },
  async deleteProduct(id, idempotencyKey) { return unwrapData(await v1Client.delete(PRODUCT_ENDPOINTS.details(id), { headers: operationHeaders({ idempotencyKey }) })); },
  async createAddon(id, body, idempotencyKey) { return unwrapData(await v1Client.post(PRODUCT_ENDPOINTS.addons(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async updateAddon(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(PRODUCT_ENDPOINTS.addonDetails(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async replaceRecipe(id, body, idempotencyKey) { return unwrapData(await v1Client.put(PRODUCT_ENDPOINTS.recipe(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async catalog(params = {}) { return unwrapData(await v1Client.get(PRODUCT_ENDPOINTS.catalog, { params: normalizePageParams(params) })); },
};
