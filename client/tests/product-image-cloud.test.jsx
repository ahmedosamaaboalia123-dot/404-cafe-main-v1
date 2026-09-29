import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadMutate, deleteMutate, createMutate, listQuery, detailsQuery } = vi.hoisted(() => ({
  uploadMutate: vi.fn(),
  deleteMutate: vi.fn(),
  createMutate: vi.fn(),
  listQuery: { data: { items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  detailsQuery: { data: null, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock("@/modules/admin/products/hooks/media.hooks", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMediaList: () => listQuery,
    useMediaDetails: () => detailsQuery,
    useUploadMedia: () => ({ mutate: uploadMutate, isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
    useDeleteMedia: () => ({ mutate: deleteMutate, isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
  };
});

vi.mock("@/modules/admin/products/hooks/product.queries", () => ({
  useProductsScreen: () => ({ data: { filters: { categories: [{ id: "507f1f77bcf86cd799439041", name: "قهوة", isActive: true }] } } }),
}));

vi.mock("@/modules/admin/products/hooks/product.mutations", () => ({
  useCreateProduct: () => ({ mutate: createMutate, isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
}));

const { v1Client } = vi.hoisted(() => ({ v1Client: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/api/v1Client", () => ({ v1Client, resolveV1BaseUrl: (base) => base }));

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/services/apiClient", () => ({ default: { get: apiGet } }));

const ProductWizard = (await import("@/modules/admin/products/components/ProductWizard")).default;
const { mediaApi } = await import("@/modules/admin/products/api/media.api");
const { getV1Menu } = await import("@/services/catalogService");

const file = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "cup.jpg", { type: "image/jpeg" });

const fillBasics = (name) => {
  fireEvent.change(screen.getByLabelText(/اسم المنتج/), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/القسم/), { target: { value: "507f1f77bcf86cd799439041" } });
};

beforeEach(() => {
  vi.clearAllMocks();
  listQuery.data = { items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } };
  detailsQuery.data = null;
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe("product images in the cloud", () => {
  it("still uploads the file as multipart/form-data with the image field", async () => {
    v1Client.post.mockResolvedValue({ ok: true, data: { asset: { id: "abc", url: "https://res.cloudinary.com/demo/a.jpg" } } });
    await mediaApi.upload(file(), "key-1");
    const [url, form, config] = v1Client.post.mock.calls[0];
    expect(url).toBe("/media/uploads");
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("image")).toBeInstanceOf(File);
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
  });

  it("uses the stored secure url for the customer menu", async () => {
    apiGet.mockResolvedValue({
      data: {
        categories: [{ id: "c1", name: "قهوة" }],
        products: [
          { id: "p1", name: "لاتيه", image: { id: "m1", url: "https://res.cloudinary.com/demo/latte.jpg" }, category: { id: "c1" }, types: [] },
          { id: "p2", name: "موكا", image: { id: "m2", url: null }, category: { id: "c1" }, types: [] },
        ],
      },
    });
    const menu = await getV1Menu();
    expect(menu.items.find((item) => item.id === "p1").image).toBe("https://res.cloudinary.com/demo/latte.jpg");
    expect(menu.items.find((item) => item.id === "p2").image).toMatch(/^https:\/\//);
  });

  it("deletes the freshly uploaded image when the product save fails", async () => {
    uploadMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess({ asset: { id: "507f1f77bcf86cd799439051", url: "https://res.cloudinary.com/demo/new.jpg", version: 0 } }),
    );
    createMutate.mockImplementation((_payload, handlers) => handlers.onError(new Error("boom")));

    render(<ProductWizard onFinished={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/اختيار صورة/), { target: { files: [file()] } });
    fireEvent.click(screen.getByRole("button", { name: /رفع واختيار/ }));
    await waitFor(() => expect(uploadMutate).toHaveBeenCalledTimes(1));

    fillBasics("لاتيه");
    fireEvent.click(screen.getByRole("button", { name: /إنشاء وفتح التفاصيل/ }));

    await waitFor(() =>
      expect(deleteMutate).toHaveBeenCalledWith(
        { mediaId: "507f1f77bcf86cd799439051", expectedVersion: 0 },
        expect.anything(),
      ),
    );
  });

  it("keeps a library image when the product save fails", async () => {
    listQuery.data = {
      items: [{ id: "507f1f77bcf86cd799439052", assetNo: "MED-00000009", status: "READY", url: "https://res.cloudinary.com/demo/lib.jpg", version: 3 }],
      pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    };
    createMutate.mockImplementation((_payload, handlers) => handlers.onError(new Error("boom")));

    render(<ProductWizard onFinished={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: /من الصور الجاهزة/ }));
    fireEvent.click(await screen.findByText(/#MED-00000009/));
    fireEvent.click(screen.getByRole("button", { name: /تأكيد الاختيار/ }));

    fillBasics("لاتيه");
    fireEvent.click(screen.getByRole("button", { name: /إنشاء وفتح التفاصيل/ }));

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(deleteMutate).not.toHaveBeenCalled();
  });
});
