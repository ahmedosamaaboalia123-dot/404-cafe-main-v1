import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Coffee, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { useAddSessionItems, useCreateOrder, useOpenTableOrder } from "../hooks/order.mutations";
import { ordersApi } from "../api/orders.api";
import SalesOptionsDialog from "../components/SalesOptionsDialog";
import { getProductCatalog, getProductsForSection } from "../services/adminProductsService";
import "../styles/SalesPage.css";

const money = (value) => `${(Number(value) || 0).toFixed(2)} ج.م`;

/**
 * Lines are keyed by the exact variant the cashier picked, so the same drink with
 * a different size, type, or add-on set is a separate line instead of silently
 * merging into the first one.
 */
const lineKey = (selection) =>
  [
    selection.product.id,
    selection.type?.id ?? "-",
    selection.size.id,
    [...selection.addons].map((a) => a.id).sort().join("+") || "-",
    selection.notes || "-",
  ].join("|");

/**
 * `price` is a client-side preview only. The server re-prices the line from
 * `productSizeId` + `addonIds`, so the ids must always be the source of truth.
 */
const buildLine = (selection) => ({
  productId: selection.product.id,
  productName: selection.product.name,
  productSizeId: selection.size.id,
  variant: selection.type?.type || "",
  size: selection.size.name,
  addonIds: selection.addons.map((a) => a.id),
  addonNames: selection.addons.map((a) => a.name),
  notes: selection.notes,
  price:
    (Number(selection.size.sellingPrice) || 0) +
    selection.addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0),
  qty: selection.quantity,
});

export default function SalesPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [invoice, setInvoice] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [fulfillmentType, setFulfillmentType] = useState("PICKUP");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(null);
  const [pickedDefaults, setPickedDefaults] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  // Expired-batch warnings returned by the server after deduction. Navigation
  // is deferred until the cashier acknowledges them.
  const [allocationWarnings, setAllocationWarnings] = useState(null);
  const [pendingNav, setPendingNav] = useState(null);

  const isTable = type === "table";
  const [tableContext, setTableContext] = useState(null);
  const tableNumber = tableContext?.table?.tableNumber;
  const createOrder = useCreateOrder();
  const openTableOrder = useOpenTableOrder();
  const addSessionItems = useAddSessionItems();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProductCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setSections(catalog.categories);
        setProducts(catalog.products);
        setActiveSection({ id: "__all__", name: "كل المنتجات" });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.response?.data?.message || e.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isTable) return;
    ordersApi.table(id).then(async (context) => context.session?.id ? { ...context, ...(await ordersApi.session(context.session.id)) } : context).then(setTableContext).catch((e) => setError(e.response?.data?.error?.messageAr || e.message));
  }, [id, isTable]);

  const visible = useMemo(() => {
    const base =
      !activeSection || activeSection.id === "__all__"
        ? products
        : getProductsForSection(products, activeSection);
    const query = productSearch.trim();
    if (!query) return base;
    return (base || []).filter((product) => String(product.name || "").includes(query));
  }, [products, activeSection, productSearch]);

  const sectionOptions = useMemo(
    () => [{ id: "__all__", name: "كل المنتجات" }, ...sections],
    [sections]
  );

  const openProduct = (product) => {
    setEditingKey(null);
    setPickedDefaults(null);
    setPicking(product);
  };

  const editLine = (line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return;
    // Prefill the dialog with what is already on the line.
    const type = product.variants?.find((t) => t.sizes?.some((s) => s.id === line.productSizeId));
    setEditingKey(line.key);
    setPickedDefaults({
      typeId: type?.id ?? product.variants?.[0]?.id ?? null,
      sizeId: line.productSizeId,
      addonIds: line.addonIds || [],
      quantity: line.qty,
      notes: line.notes || "",
    });
    setPicking(product);
  };

  const confirmSelection = (selection) => {
    const key = lineKey(selection);
    const editing = editingKey;
    setInvoice((current) => {
      const index = current.findIndex((x) => x.key === key);

      // Re-opening a line replaces it instead of adding its quantity again.
      if (editing) {
        if (index === -1) {
          return [...current, { key, ...buildLine(selection) }];
        }
        return current.map((x, i) => (i === index ? { ...x, ...buildLine(selection), key: x.key } : x));
      }

      // Identical variant + add-on set: merge the quantity.
      if (index !== -1) {
        return current.map((x, i) => (i === index ? { ...x, qty: x.qty + selection.quantity } : x));
      }
      return [...current, { key, ...buildLine(selection) }];
    });
    setPicking(null);
    setEditingKey(null);
  };

  const updateQty = (index, delta) =>
    setInvoice((x) =>
      x.map((v, i) =>
        i === index ? { ...v, qty: Math.max(1, v.qty + delta) } : v
      )
    );

  const removeItem = (index) => setInvoice((x) => x.filter((_, i) => i !== index));

  const total = invoice.reduce((sum, item) => sum + item.price * item.qty, 0);

  const confirm = async () => {
    if (!invoice.length || saving) return;
    if (!isTable && (!customer.name.trim() || !customer.phone.trim() || (fulfillmentType === "DELIVERY" && !customer.address.trim()))) {
      setError("أكمل اسم العميل ورقم الهاتف (والعنوان للتوصيل).");
      return;
    }
    setSaving(true);
    setError("");
    setAllocationWarnings(null);
    setPendingNav(null);
    try {
      const items = invoice.map((line) => ({
        productId: String(line.productId),
        productSizeId: String(line.productSizeId),
        quantity: Number(line.qty) || 1,
        ...(line.addonIds?.length ? { addonIds: line.addonIds.map(String) } : {}),
        ...(line.notes ? { notes: line.notes } : {}),
      }));
      const go = (to) => navigate(to, { replace: true });
      if (isTable) {
        if (tableContext?.session?.id) {
          const result = await addSessionItems.mutateAsync({ sessionId: tableContext.session.id, body: { items, expectedSessionVersion: tableContext.session.version, expectedOrderVersion: tableContext.order.version } });
          finishWithWarnings(result, () => go(`/admin/orders/tables/${id}`));
        } else {
          const result = await openTableOrder.mutateAsync({ tableId: id, body: { items, expectedTableVersion: tableContext?.table?.version } });
          finishWithWarnings(result, () => go(`/admin/orders/tables/${id}`));
        }
      } else {
        const mode = fulfillmentType === "PICKUP" ? "TAKEAWAY" : fulfillmentType;
        const result = await createOrder.mutateAsync({ fulfillmentType: mode, customer: { name: customer.name.trim(), phone: customer.phone.trim(), ...(mode === "DELIVERY" ? { address: customer.address.trim() } : {}) }, items });
        finishWithWarnings(result, () => go(type === "takeaway" ? "/admin/orders/takeaway" : "/admin/orders/online"));
      }
    } catch (e) {
      setError(e.response?.data?.error?.messageAr || e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  // The deduction already happened server-side; warnings only pause navigation
  // so the cashier sees which expired batches were consumed from.
  const finishWithWarnings = (result, navigateFn) => {
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
    if (!warnings.length) { navigateFn(); return; }
    setAllocationWarnings(warnings);
    setPendingNav(() => navigateFn);
  };

  return (
    <div className="sales-page">
      <PageHeader
        title={isTable ? `بيع - طاولة ${tableNumber ?? "..."}` : "طلب أونلاين"}
        breadcrumbs={["الطلبات", "صفحة البيع"]}
      />

      {error && <p role="alert" className="sales-error">{error}</p>}

      {allocationWarnings?.length > 0 && <div role="alert" className="sales-warning">
        <div className="sales-warning-title"><AlertTriangle size={18} /><span>تم الخصم من دفعات منتهية الصلاحية</span></div>
        <ul>{allocationWarnings.map((warning, index) => <li key={warning.batchId || index}>{warning.materialName || "مادة"} — دفعة #{warning.batchNumber || String(warning.batchId || "").slice(-6)} (انتهت {warning.expiryOn || "—"})</li>)}</ul>
        <button type="button" className="btn-confirm-invoice" onClick={() => { setAllocationWarnings(null); if (pendingNav) pendingNav(); setPendingNav(null); }}>فهمت، متابعة</button>
      </div>}

      {loading && <p className="sales-loading">جاري تحميل المنتجات...</p>}

      <div className="sales-layout">
        {/* الأقسام — يمين (RTL) */}
        <aside className="sales-sections-col">
          <h3 className="sales-col-title">الأقسام</h3>
          <div className="sales-sections-list">
            {sectionOptions.map((section) => (
              <button
                key={section.id || section.name}
                className={`sales-section-btn ${activeSection?.id === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section)}
              >
                {section.name}
              </button>
            ))}
          </div>
        </aside>

        {/* المنتجات — شمال/وسط (RTL) */}
        <section className="sales-products-col">
          <h3 className="sales-col-title">المنتجات{activeSection?.name && activeSection.id !== "__all__" ? ` — ${activeSection.name}` : ""}</h3>
          <div className="sales-products-search">
            <input
              placeholder="ابحث باسم المنتج"
              aria-label="بحث باسم المنتج"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />
          </div>
          <div className="sales-products-grid">
            {visible.map((product) => (
              <button
                key={product.id}
                className="sales-product-card"
                onClick={() => openProduct(product)}
              >
                <Coffee size={16} className="sales-product-icon" />
                <div className="sales-product-info">
                  <strong className="sales-product-name">{product.name}</strong>
                  <span className="sales-product-variant">
                    {product.sizeCount ? `${product.sizeCount} حجم` : "بدون أحجام"}
                    {product.hasAddons ? " • إضافات" : ""}
                  </span>
                </div>
                <span className="sales-product-price">
                  {product.basePrice != null ? `يبدأ من ${money(product.basePrice)}` : "السعر حسب الحجم"}
                </span>
              </button>
            ))}
            {!visible.length && !loading && (
              <div className="sales-empty">لا توجد منتجات في هذا القسم</div>
            )}
          </div>
        </section>
      </div>

      {/* الفاتورة — تحت (شريط كامل) */}
      <div className="sales-invoice-strip">
        <div className="sales-invoice-header">
          <h3 className="sales-col-title">الفاتورة</h3>
          <span className="sales-invoice-count">{invoice.length} منتج</span>
        </div>

        {!isTable && (
          <div className="sales-customer-fields">
            <div className="fulfillment-switch" role="group" aria-label="نوع الطلب">
              <button type="button" className={fulfillmentType === "PICKUP" ? "active" : ""} onClick={() => setFulfillmentType("PICKUP")}>تيك أواي</button>
              <button type="button" className={fulfillmentType === "DELIVERY" ? "active" : ""} onClick={() => setFulfillmentType("DELIVERY")}>أونلاين</button>
            </div>
            <label>
              <span>اسم العميل</span>
              <input placeholder="اسم العميل" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            </label>
            <label>
              <span>رقم الهاتف</span>
              <input placeholder="رقم الهاتف" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </label>
            {fulfillmentType === "DELIVERY" && (
              <label>
                <span>عنوان التوصيل</span>
                <input placeholder="عنوان التوصيل" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              </label>
            )}
          </div>
        )}

        {invoice.length === 0 ? (
          <div className="sales-empty">لم تُضف أي منتج بعد</div>
        ) : (
          <div className="sales-invoice-body">
            {invoice.map((item, index) => (
              <div className="sales-invoice-item" key={item.key}>
                <div className="sales-invoice-item-info">
                  <strong>{item.productName}</strong>
                  <span>
                    {[item.variant, item.size].filter(Boolean).join(" - ")}
                    {item.addonNames?.length ? ` • ${item.addonNames.join(" + ")}` : ""}
                  </span>
                  {item.notes && <span className="sales-invoice-item-notes">ملاحظة: {item.notes}</span>}
                </div>
                <div className="sales-invoice-qty">
                  <button onClick={() => updateQty(index, -1)} aria-label={`إنقاص كمية ${item.productName}`}><Minus size={14} /></button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(index, 1)} aria-label={`زيادة كمية ${item.productName}`}><Plus size={14} /></button>
                </div>
                <span className="sales-invoice-item-price">{money(item.price * item.qty)}</span>
                <button className="sales-invoice-item-remove" onClick={() => editLine(item)} aria-label={`تعديل خيارات ${item.productName}`} title="تعديل الخيارات">
                  <Pencil size={14} />
                </button>
                <button className="sales-invoice-item-remove" onClick={() => removeItem(index)} aria-label={`حذف ${item.productName}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="sales-invoice-footer">
          <div className="sales-invoice-total">
            <span>الإجمالي</span>
            <strong>{total.toFixed(2)} ج.م</strong>
          </div>
          <button
            className="btn-confirm-invoice"
            disabled={saving || !invoice.length || (isTable && !tableContext)}
            onClick={confirm}
          >
            <CheckCircle2 size={16} />
            {saving ? "جاري الحفظ..." : "تأكيد الطلب"}
          </button>
        </div>
      </div>

      <SalesOptionsDialog
        product={picking}
        isOpen={Boolean(picking)}
        initial={pickedDefaults}
        onClose={() => {
          setPicking(null);
          setPickedDefaults(null);
          setEditingKey(null);
        }}
        onConfirm={confirmSelection}
      />
    </div>
  );
}
