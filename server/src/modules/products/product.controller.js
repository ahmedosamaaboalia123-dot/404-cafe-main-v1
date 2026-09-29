import { sendCreated, sendSuccess } from '../../platform/http/response.js';
import { getCatalog } from './catalog.queries.js';
import { calculateExpectedProductCost } from './product-cost.service.js';
import { getProductDetails, getProductsScreen, getTopPublicProducts } from './product.queries.js';
import {
  addonDto,
  addProductSize,
  addProductType,
  createAddon,
  createCategory,
  createProduct,
  deleteProduct,
  deleteProductSize,
  deleteProductType,
  productDto,
  sizeDto,
  typeDto,
  updateCategory,
  updateAddon,
  updateProduct,
  updateProductSize,
  updateProductType
} from './product.service.js';
import { recipeDto, replaceSizeRecipe } from './recipe.service.js';
const ctx = (req, d) => ({ ...req.auth, ...d.serviceContext });
export function createProductController(d) {
  return {
    screen: async (req, res) =>
      sendSuccess(res, await getProductsScreen(req.validated.query, ctx(req, d))),
    createCategory: async (req, res) =>
      sendCreated(res, { category: await createCategory(req.validated.body, ctx(req, d)) }),
    updateCategory: async (req, res) =>
      sendSuccess(res, {
        category: await updateCategory(req.validated.params.id, req.validated.body, ctx(req, d))
      }),
    createProduct: async (req, res) =>
      sendCreated(res, {
        product: productDto(await createProduct(req.validated.body, ctx(req, d)))
      }),
    details: async (req, res) =>
      sendSuccess(res, await getProductDetails(req.validated.params.id, ctx(req, d))),
    updateProduct: async (req, res) =>
      sendSuccess(res, {
        product: productDto(
          await updateProduct(req.validated.params.id, req.validated.body, ctx(req, d))
        )
      }),
    createType: async (req, res) =>
      sendCreated(res, {
        type: typeDto(
          await addProductType(req.validated.params.id, req.validated.body, ctx(req, d))
        )
      }),
    updateType: async (req, res) =>
      sendSuccess(res, {
        type: typeDto(
          await updateProductType(
            req.validated.params.id,
            req.validated.params.typeId,
            req.validated.body,
            ctx(req, d)
          )
        )
      }),
    deleteType: async (req, res) =>
      sendSuccess(
        res,
        await deleteProductType(
          req.validated.params.id,
          req.validated.params.typeId,
          ctx(req, d)
        )
      ),
    createSize: async (req, res) => {
      const { size, recipe } = await addProductSize(
        req.validated.params.id,
        req.validated.body,
        ctx(req, d)
      );
      sendCreated(res, {
        size: sizeDto(size),
        recipe: recipe ? recipeDto(recipe) : null,
        costPreview: await calculateExpectedProductCost(size._id, [], ctx(req, d))
      });
    },
    updateSize: async (req, res) =>
      sendSuccess(res, {
        size: sizeDto(
          await updateProductSize(req.validated.params.id, req.validated.body, ctx(req, d))
        )
      }),
    deleteSize: async (req, res) =>
      sendSuccess(res, await deleteProductSize(req.validated.params.id, ctx(req, d))),
    deleteProduct: async (req, res) =>
      sendSuccess(res, await deleteProduct(req.validated.params.id, ctx(req, d))),
    recipe: async (req, res) => {
      const recipe = await replaceSizeRecipe(
        req.validated.params.id,
        req.validated.body,
        ctx(req, d)
      );
      sendSuccess(res, {
        recipe: recipeDto(recipe),
        costPreview: await calculateExpectedProductCost(req.validated.params.id, [], ctx(req, d))
      });
    },
    addon: async (req, res) =>
      sendCreated(res, {
        addon: addonDto(
          await createAddon(req.validated.params.id, req.validated.body, ctx(req, d))
        ),
        costCompleteness: 'NO_INVENTORY_RECIPE'
      }),
    updateAddon: async (req, res) =>
      sendSuccess(res, {
        addon: addonDto(
          await updateAddon(req.validated.params.id, req.validated.body, ctx(req, d))
        ),
        costCompleteness: 'NO_INVENTORY_RECIPE'
      }),
    catalog: async (req, res) => {
      const data = await getCatalog(req.validated.query, ctx(req, d));
      const etag = `"${data.catalogVersion}"`;
      if (req.headers['if-none-match'] === etag) return res.status(304).end();
      res.set('ETag', etag);
      return sendSuccess(res, data);
    },
    topProducts: async (req, res) =>
      sendSuccess(res, await getTopPublicProducts(req.validated.query, ctx(req, d)))
  };
}
