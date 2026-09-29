import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PRODUCT_ENDPOINTS } from "@/modules/admin/products/api/products.api";
import { MEDIA_ENDPOINTS } from "@/modules/admin/products/api/media.api";
import {
  PRODUCT_STATUSES,
  toCategoryOptions,
  toProductDetails,
  toProductsScreen,
} from "@/modules/admin/products/adapters/product.adapter";
import {
  addonFormSchema,
  addonUpdateSchema,
  categoryFormSchema,
  categoryStatusSchema,
  firstProductFormError,
  productFormSchema,
  productSizeSchema,
  productTypeSchema,
  productUpdateSchema,
  recipeSchema,
} from "@/modules/admin/products/schemas/product.schema";
import { renderApp } from "@/test/renderApp";
import ProductsPage from "@/modules/admin/products/pages/ProductsPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));
vi.mock("@/modules/admin/inventory/hooks/inventory.queries", () => ({
  useMaterialsScreen: () => ({
    data: { materials: [{ id: "507f1f77bcf86cd799439011", name: "بن أرابيكا" }], pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useMaterialDetailsQuery: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock("@/modules/admin/products/hooks/product.queries", () => ({
  useProductsScreen: () => ({
    data: {
      products: [
        { id: "p1", name: "إسبريسو", description: "", imageId: null, categoryId: "c1", isVisibleInMenu: true, status: "ACTIVE", statusLabel: "نشط", catalogVersion: 1, version: 2 },
        { id: "p2", name: "لاتيه", description: "", imageId: null, categoryId: "c1", isVisibleInMenu: false, status: "INACTIVE", statusLabel: "موقوف", catalogVersion: 1, version: 1 },
      ],
      summary: { active: 1, inactive: 1 },
      filters: { categories: [{ id: "c1", name: "قهوة", isActive: true, sortOrder: 0, version: 0 }], statuses: ["ACTIVE", "INACTIVE"] },
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useProductDetails: () => ({
    data: {
      product: { id: "p1", name: "إسبريسو", description: "", imageId: null, categoryId: "c1", isVisibleInMenu: true, status: "ACTIVE", statusLabel: "نشط", catalogVersion: 1, version: 2 },
      types: [{ id: "t1", productId: "p1", name: "ساخن", allowedMaterialIds: [], isActive: true, sortOrder: 0, version: 0 }],
      sizes: [{ id: "s1", productId: "p1", typeId: "t1", name: "دبل", sellingPrice: "60.00", currency: "EGP", isActive: true, sortOrder: 0, version: 1 }],
      recipes: [{ id: "r1", productSizeId: "s1", ingredients: [{ materialId: "m1", quantitySmall: "18", smallUnitId: "u2", materialName: "بن أرابيكا", unitName: "جرام" }], version: 0 }],
      recipeBySize: { s1: { id: "r1", productSizeId: "s1", ingredients: [{ materialId: "m1", quantitySmall: "18", smallUnitId: "u2", materialName: "بن أرابيكا", unitName: "جرام" }], version: 0 } },
      addons: [{ id: "a1", productId: "p1", name: "حليب إضافي", sellingPrice: "10.00", currency: "EGP", isActive: true, sortOrder: 0, version: 0 }],
      costPreview: [{ sizeId: "s1", available: true, cost: "12.50", profit: "47.50", margin: "79.17", costCompleteness: "COMPLETE" }],
      costBySize: { s1: { sizeId: "s1", available: true, cost: "12.50", profit: "47.50", margin: "79.17", costCompleteness: "COMPLETE" } },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useCatalogPreview: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock("@/modules/admin/products/hooks/media.hooks", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMediaList: () => ({ data: { items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
    useMediaDetails: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
    useUploadMedia: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
    useDeleteMedia: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
  };
});

const adminAuth = {
  permissions: [{ pageKey: "products", visible: true, actions: ["read", "create", "manage"] }],
};

const categoryId = "507f1f77bcf86cd799439041";
const materialId = "507f1f77bcf86cd799439011";
const imageId = "507f1f77bcf86cd799439051";

describe("products + media v1 contract", () => {
  it("targets the real backend routes, not legacy paths", () => {
    expect(PRODUCT_ENDPOINTS.screen).toBe("/products-screen");
    expect(PRODUCT_ENDPOINTS.categories).toBe("/product-categories");
    expect(PRODUCT_ENDPOINTS.categoryDetails("abc")).toBe("/product-categories/abc");
    expect(PRODUCT_ENDPOINTS.create).toBe("/products");
    expect(PRODUCT_ENDPOINTS.details("abc")).toBe("/products/abc");
    expect(PRODUCT_ENDPOINTS.types("abc")).toBe("/products/abc/types");
    expect(PRODUCT_ENDPOINTS.typeDetails("abc", "t1")).toBe("/products/abc/types/t1");
    expect(PRODUCT_ENDPOINTS.sizes("abc")).toBe("/products/abc/sizes");
    expect(PRODUCT_ENDPOINTS.sizeDetails("abc")).toBe("/product-sizes/abc");
    expect(PRODUCT_ENDPOINTS.addons("abc")).toBe("/products/abc/addons");
    expect(PRODUCT_ENDPOINTS.addonDetails("abc")).toBe("/product-addons/abc");
    expect(PRODUCT_ENDPOINTS.recipe("abc")).toBe("/product-sizes/abc/recipe");
    expect(PRODUCT_ENDPOINTS.catalog).toBe("/catalog");
    expect(MEDIA_ENDPOINTS.uploads).toBe("/media/uploads");
    expect(MEDIA_ENDPOINTS.list).toBe("/media");
    expect(MEDIA_ENDPOINTS.details("abc")).toBe("/media/abc");
  });

  it("cleans screen, details, and cost preview with string money", () => {
    const screen = toProductsScreen({
      products: [{ id: "p1", name: "إسبريسو", status: "ACTIVE", categoryId: "c1", version: 2 }],
      summary: { ACTIVE: 3, INACTIVE: 1 },
      filters: { categories: [{ id: "c1", name: "قهوة", isActive: true }] },
    });
    expect(screen.products[0].statusLabel).toBe("نشط");
    expect(screen.products[0].version).toBe(2);
    expect(screen.summary).toEqual({ active: 3, inactive: 1 });
    expect(toCategoryOptions(screen.filters.categories)).toEqual([{ value: "c1", label: "قهوة" }]);
    expect(PRODUCT_STATUSES.INACTIVE).toBe("موقوف");
    const details = toProductDetails({
      product: { id: "p1", name: "x", status: "ACTIVE" },
      types: [{ id: "t1", allowedMaterialIds: ["m1"] }],
      sizes: [{ id: "s1", sellingPrice: 60 }],
      recipes: [{ id: "r1", productSizeId: "s1", ingredients: [{ materialId: "m1", quantitySmall: 18 }] }],
      addons: [{ id: "a1", sellingPrice: 10 }],
      costPreview: [{ sizeId: "s1", available: true, cost: 12.5, profit: 47.5, margin: 79.17, costCompleteness: "COMPLETE" }],
    });
    expect(details.sizes[0].sellingPrice).toBe("60");
    expect(details.recipeBySize.s1.ingredients[0].quantitySmall).toBe("18");
    expect(details.costBySize.s1.profit).toBe("47.5");
    expect(details.costBySize.s1.costCompleteness).toBe("COMPLETE");
  });

  it("validates product, category, type, size, recipe, and addon bodies exactly like the backend", () => {
    expect(categoryFormSchema.safeParse({ name: "قهوة" }).success).toBe(true);
    expect(categoryFormSchema.safeParse({ name: "x" }).success).toBe(false);
    expect(categoryStatusSchema.safeParse({ isActive: false, expectedVersion: 1 }).success).toBe(true);
    expect(categoryStatusSchema.safeParse({ isActive: false }).success).toBe(false);
    expect(productFormSchema.safeParse({ name: "إسبريسو", categoryId, imageId }).success).toBe(true);
    expect(productFormSchema.safeParse({ name: "x", categoryId }).success).toBe(false);
    expect(productUpdateSchema.safeParse({ status: "INACTIVE", expectedVersion: 2 }).success).toBe(true);
    expect(productUpdateSchema.safeParse({ status: "INACTIVE" }).success).toBe(false);
    expect(productTypeSchema.safeParse({ name: "ساخن", allowedMaterialIds: [materialId] }).success).toBe(true);
    expect(productSizeSchema.safeParse({ typeId: materialId, name: "دبل", sellingPrice: "60.00" }).success).toBe(true);
    expect(productSizeSchema.safeParse({ typeId: materialId, name: "دبل", sellingPrice: "60.000" }).success).toBe(false);
    expect(recipeSchema.safeParse({ ingredients: [{ materialId, quantitySmall: "18" }] }).success).toBe(true);
    expect(recipeSchema.safeParse({ ingredients: [{ materialId, quantitySmall: "18" }, { materialId, quantitySmall: "5" }] }).success).toBe(false);
    expect(recipeSchema.safeParse({ ingredients: [{ materialId, quantitySmall: "0" }] }).success).toBe(false);
    expect(addonFormSchema.safeParse({ name: "حليب", sellingPrice: "10.00" }).success).toBe(true);
    expect(addonUpdateSchema.safeParse({ addonId: "a1", sellingPrice: "12.00", expectedVersion: 0 }).success).toBe(false);
    expect(addonUpdateSchema.safeParse({ sellingPrice: "12.00", expectedVersion: 0 }).success).toBe(true);
    expect(firstProductFormError(productFormSchema.safeParse({ name: "", categoryId: "" }))).toBeTruthy();
  });
});

describe("products page on the v1 layer", () => {
  it("renders server products without local cost math or delete actions", () => {
    renderApp(<ProductsPage />, { route: "/admin/products", auth: adminAuth });
    expect(screen.getByText("إسبريسو")).toBeInTheDocument();
    expect(screen.getByText("لاتيه")).toBeInTheDocument();
    expect(screen.queryByText("حذف المنتج")).not.toBeInTheDocument();
    expect(screen.queryByText("حذف")).not.toBeInTheDocument();
  });

  it("opens product details with server cost preview and recipe", async () => {
    renderApp(<ProductsPage />, { route: "/admin/products", auth: adminAuth });
    fireEvent.click(screen.getAllByRole("button", { name: "فتح" })[0]);
    expect((await screen.findAllByText("دبل")).length).toBeGreaterThan(0);
    expect(screen.getByText("حليب إضافي")).toBeInTheDocument();
    expect(screen.getByText("بن أرابيكا × 18")).toBeInTheDocument();
    expect(screen.getByText("حذف المنتج")).toBeInTheDocument();
  });
});
