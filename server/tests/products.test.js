import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { toDecimal128 } from '../src/platform/database/decimal.js';
import { getCatalog, searchVisibleProductsForAi } from '../src/modules/products/catalog.queries.js';
import { createCatalogRouter } from '../src/modules/products/product.routes.js';
import { calculateExpectedProductCost } from '../src/modules/products/product-cost.service.js';
import { getTopPublicProducts } from '../src/modules/products/product.queries.js';
import {
  replaceSizeRecipe,
  validateRecipeIngredients
} from '../src/modules/products/recipe.service.js';

const chain = (value) => ({
  session: async () => value,
  lean: async () => value,
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  }
});
const id = () => new mongoose.Types.ObjectId();

describe('product recipes and expected cost', () => {
  it('rejects a duplicate material before querying MongoDB', async () => {
    const materialId = id();
    const find = vi.fn();
    await expect(
      validateRecipeIngredients(
        [
          { materialId, quantitySmall: '10' },
          { materialId, quantitySmall: '20' }
        ],
        { session: {}, productModels: { RawMaterial: { find } } }
      )
    ).rejects.toMatchObject({ code: 'DUPLICATE_RECIPE_MATERIAL', status: 422 });
    expect(find).not.toHaveBeenCalled();
  });

  it('rejects an inactive or missing recipe material', async () => {
    await expect(
      validateRecipeIngredients([{ materialId: id(), quantitySmall: '1' }], {
        session: {},
        productModels: { RawMaterial: { find: () => chain([]) } }
      })
    ).rejects.toMatchObject({ code: 'INVALID_RECIPE_MATERIAL' });
  });

  it('replaces the recipe and locks supplier/unit identity on every used material', async () => {
    const materialId = id(),
      unitId = id(),
      sizeId = id(),
      typeId = id();
    const recipe = { _id: id(), productSizeId: sizeId, ingredients: [], version: 0 };
    const updateMany = vi.fn();
    const models = {
      ProductSize: { findById: () => chain({ _id: sizeId, typeId }) },
      ProductType: { findById: () => chain({ _id: typeId, allowedMaterialIds: [materialId] }) },
      RawMaterial: {
        find: () => chain([{ _id: materialId, name: 'بن', status: 'ACTIVE', smallUnitId: unitId }]),
        updateMany
      },
      MeasurementUnit: { find: () => chain([{ _id: unitId, nameAr: 'جرام' }]) },
      ProductRecipe: {
        findOne: () => chain(null),
        create: async ([value]) => [Object.assign(recipe, value)]
      }
    };
    const result = await replaceSizeRecipe(
      sizeId,
      { ingredients: [{ materialId, quantitySmall: '18' }] },
      { session: {}, actorId: id(), productModels: models }
    );
    expect(result.ingredients[0].materialNameSnapshot).toBe('بن');
    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: [materialId] }, unitsLocked: false },
      {
        $set: {
          unitsLocked: true,
          supplierLockedAt: expect.any(Date),
          supplierLockReason: 'RECIPE_USE'
        }
      },
      { session: {} }
    );
  });

  it('calculates current expected cost, profit, and margin from multi-batch simulation', async () => {
    const sizeId = id(),
      materialId = id();
    const result = await calculateExpectedProductCost(sizeId, [], {
      productModels: {
        ProductSize: { findById: () => chain({ _id: sizeId, sellingPrice: toDecimal128('50') }) },
        ProductRecipe: {
          findOne: () =>
            chain({
              productSizeId: sizeId,
              ingredients: [{ materialId, quantitySmall: toDecimal128('100') }]
            })
        }
      },
      inventoryPort: {
        simulate: vi.fn(async () => [
          {
            materialId: String(materialId),
            batchId: String(id()),
            quantitySmall: '60',
            inventoryValue: '12'
          },
          {
            materialId: String(materialId),
            batchId: String(id()),
            quantitySmall: '40',
            inventoryValue: '12'
          }
        ])
      }
    });
    expect(result).toMatchObject({
      available: true,
      cost: '24',
      profit: '26',
      margin: '52',
      costCompleteness: 'COMPLETE'
    });
    expect(result.simulatedAllocations).toHaveLength(2);
  });
});

describe('public and AI catalog projections', () => {
  const productId = id(),
    categoryId = id(),
    typeId = id(),
    sizeId = id(),
    addonId = id();
  const productModels = {
    Product: {
      find: () =>
        chain([
          {
            _id: productId,
            name: 'لاتيه',
            description: 'قهوة',
            categoryId,
            isVisibleInMenu: true,
            status: 'ACTIVE',
            catalogVersion: 4,
            version: 2
          }
        ]),
      countDocuments: async () => 1
    },
    ProductCategory: {
      find: () => chain([{ _id: categoryId, name: 'قهوة', description: '', isActive: true }])
    },
    ProductType: {
      find: () =>
        chain([{ _id: typeId, productId, name: 'ساخن', isActive: true, sortOrder: 1, version: 1 }])
    },
    ProductSize: {
      find: () =>
        chain([
          {
            _id: sizeId,
            productId,
            typeId,
            name: 'وسط',
            sellingPrice: toDecimal128('50'),
            currency: 'EGP',
            isActive: true,
            version: 1
          }
        ])
    },
    ProductAddon: {
      find: () =>
        chain([
          {
            _id: addonId,
            productId,
            name: 'إضافة',
            sellingPrice: toDecimal128('5'),
            currency: 'EGP',
            isActive: true,
            version: 1
          }
        ])
    }
  };
  it('returns one nested public catalog response with deterministic version', async () => {
    const first = await getCatalog({ page: 1, limit: 10 }, { productModels });
    const second = await getCatalog({ page: 1, limit: 10 }, { productModels });
    expect(first.catalogVersion).toBe(second.catalogVersion);
    expect(first.products[0].types[0].sizes[0].price).toBe('50');
    expect(first.pageMeta.totalItems).toBe(1);
  });
  it('never exposes recipe, cost, material, batch, or profit fields to AI', async () => {
    const result = await searchVisibleProductsForAi({ limit: 10 }, { productModels });
    const serialized = JSON.stringify(result).toLowerCase();
    for (const forbidden of ['recipe', 'cost', 'material', 'batch', 'profit'])
      expect(serialized).not.toContain(forbidden);
  });
});

describe('public best-seller aggregation for /products/public/top', () => {
  const latte = id();
  const mocha = id();
  const cake = id();
  const tea = id();
  const now = new Date('2026-02-10T12:00:00.000Z');
  const orderA = id();
  const orderB = id();
  const item = (orderId, productId, productName, quantity, lineSubtotal) => ({
    orderId,
    productId,
    productName,
    quantity,
    lineSubtotal: toDecimal128(lineSubtotal)
  });
  const buildModels = () => ({
    Order: {
      find: (match) => {
        expect(match.status).toEqual({ $ne: 'CANCELLED' });
        expect(match.createdAt.$gte).toEqual(new Date(now.getTime() - 30 * 86400000));
        return chain([{ _id: orderA }, { _id: orderB }]);
      }
    },
    OrderItem: {
      find: (match) => {
        expect(match.orderId.$in).toHaveLength(2);
        return chain([
          item(orderA, latte, 'لاتيه', 3, '25'),
          item(orderA, latte, 'لاتيه', 1, '25'),
          item(orderA, mocha, 'موكا', 5, '125'),
          item(orderB, tea, 'شاي', 4, '80'),
          item(orderB, cake, 'كيكة', 2, '60')
        ]);
      }
    }
  });

  it('sums quantity per product, sorts by volume then revenue, and returns a bare array', async () => {
    const rows = await getTopPublicProducts({ limit: 8, days: 30 }, {
      publicCatalogModels: buildModels(),
      now
    });
    expect(Array.isArray(rows)).toBe(true);
    // mocha(5) leads on volume; tea(4) then latte(4) break the tie on revenue.
    expect(rows.map((r) => r.productId)).toEqual([
      String(mocha),
      String(tea),
      String(latte),
      String(cake)
    ]);
    expect(rows[0]).toMatchObject({ productName: 'موكا', quantity: 5, total: '125' });
    expect(rows[1]).toMatchObject({ productName: 'شاي', quantity: 4, total: '80' });
    expect(rows[2]).toMatchObject({ productName: 'لاتيه', quantity: 4, total: '50' });
  });

  it('caps the limit at 10 and never returns cost or recipe fields', async () => {
    const rows = await getTopPublicProducts({ limit: 99, days: 30 }, {
      publicCatalogModels: buildModels(),
      now
    });
    expect(rows.length).toBeLessThanOrEqual(10);
    const serialized = JSON.stringify(rows).toLowerCase();
    for (const forbidden of ['recipe', 'cost', 'material', 'profit', 'supplier'])
      expect(serialized).not.toContain(forbidden);
  });

  it('returns an empty list when the window has no orders', async () => {
    const models = { Order: { find: () => chain([]) }, OrderItem: { find: () => chain([]) } };
    await expect(
      getTopPublicProducts({}, { publicCatalogModels: models, now })
    ).resolves.toEqual([]);
  });

  it('is mounted publicly under /api/v1 and returns a bare array envelope', async () => {
    // Mounted exactly like app.js does (router -> config.apiBasePath) so the
    // resolved public path is asserted without needing a live MongoDB.
    const app = express().use(
      '/api/v1',
      createCatalogRouter({ serviceContext: { publicCatalogModels: buildModels(), now } })
    );
    const response = await request(app)
      .get('/api/v1/products/public/top?limit=8&days=30')
      .expect(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data[0].productId).toBe(String(mocha));
  });

  it('rejects an out-of-range limit before any database access', async () => {
    const find = vi.fn();
    const app = express().use(
      '/api/v1',
      createCatalogRouter({
        serviceContext: { publicCatalogModels: { Order: { find }, OrderItem: { find } } }
      })
    );
    await request(app).get('/api/v1/products/public/top?limit=99').expect(400);
    expect(find).not.toHaveBeenCalled();
  });
});
