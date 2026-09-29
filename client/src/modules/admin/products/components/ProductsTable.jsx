import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { AsyncState, ServerPagination } from "@/shared/components";
import { useProductsScreen } from "../hooks/product.queries";
import { ProductThumb } from "./MediaPicker";
import "./ProductsTable.css";

export default function ProductsTable({ onOpen }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);

  const query = useProductsScreen({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
    status: status || undefined,
  });

  const data = query.data;
  const rows = data?.products || [];
  const categories = data?.filters?.categories || [];
  const categoryNameOf = (product) =>
    categories.find((item) => String(item.id) === String(product.categoryId))?.name || "—";

  return (
    <div className="products-table-card">
      <div className="table-card-header">
        <div className="table-card-title">
          <span>قائمة المنتجات</span>
        </div>
        <div className="table-header-actions">
          <div className="search-input-wrapper">
            <input
              className="table-search-input"
              placeholder="ابحث باسم المنتج"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Search size={17} className="table-search-icon" />
          </div>
          <select
            className="products-filter-select"
            aria-label="القسم"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">كل الأقسام</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="products-filter-select"
            aria-label="الحالة"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="INACTIVE">موقوف</option>
          </select>
          <button type="button" className="refresh-icon-btn" aria-label="تحديث" onClick={() => query.refetch()}>
            <RefreshCw size={17} className={query.isFetching ? "is-spinning" : ""} />
          </button>
        </div>
      </div>

      <div className="table-card-summary">
        <span>
          نشط: <strong>{data?.summary?.active ?? 0}</strong>
        </span>
        <span>
          موقوف: <strong>{data?.summary?.inactive ?? 0}</strong>
        </span>
      </div>

      <AsyncState
        loading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        empty={!query.isLoading && rows.length === 0}
        emptyText="لا توجد منتجات مطابقة للبحث"
      >
        <div className="table-responsive">
          <table className="products-custom-table">
            <thead>
              <tr>
                <th>الصورة</th>
                <th>المنتج</th>
                <th>القسم</th>
                <th>الحالة</th>
                <th>الظهور</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <ProductThumb imageId={product.imageId} url={product.imageUrl} />
                  </td>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td>{categoryNameOf(product)}</td>
                  <td>
                    <span className={`status-badge ${product.status === "ACTIVE" ? "active" : "withdrawn"}`}>
                      {product.statusLabel || (product.status === "ACTIVE" ? "نشط" : "موقوف")}
                    </span>
                  </td>
                  <td>{product.isVisibleInMenu ? "في المنيو" : "مخفي"}</td>
                  <td>
                    <button type="button" className="btn-open-details" onClick={() => onOpen?.(String(product.id))}>
                      فتح
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
      <ServerPagination meta={data?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="منتج" />
    </div>
  );
}
