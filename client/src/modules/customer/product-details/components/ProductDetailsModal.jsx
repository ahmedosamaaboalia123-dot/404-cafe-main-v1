import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Bot,
  Coffee,
  PlusCircle,
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  ShoppingBag,
  Check,
} from "lucide-react";
import "../styles/ProductDetails.css";

// Sizes in exact order: كبير (Right) | وسط (Center) | صغير (Left)
const DEFAULT_SIZES = [
  { id: "large", name: "كبير", volume: "470 مل", priceDiff: 10 },
  { id: "medium", name: "وسط", volume: "350 مل", priceDiff: 0 },
  { id: "small", name: "صغير", volume: "250 مل", priceDiff: -5 },
];

const DEFAULT_TYPES = [
  { id: "hot", name: "ساخن" },
  { id: "iced", name: "مثلج" },
];

// Add-ons in exact order: كريمة مخفوقة | صلصة كراميل | إكسترا شوت
const DEFAULT_ADDONS = [
  {
    id: "whipped_cream",
    name: "كريمة مخفوقة",
    price: 10,
    image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "caramel_sauce",
    name: "صلصة كراميل",
    price: 10,
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "extra_shot",
    name: "إكسترا شوت",
    price: 10,
    image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=200&q=80",
  },
];

export default function ProductDetailsModal({
  isOpen = true,
  product = null,
  onClose,
  onAddToCart,
  onOpenCart,
  onOpenAiBot,
  cartCount = 0,
}) {
  if (!isOpen || !product) return null;

  // Use the real catalog sizes/types/addons when available, else fall back to
  // the bundled demo defaults (only names/prices — never ingredients).
  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const types = product.types?.length ? product.types : DEFAULT_TYPES;
  const addons = product.addons?.length ? product.addons : DEFAULT_ADDONS;

  // Selected Options State (based on the active data source)
  const [selectedType, setSelectedType] = useState(types[0]?.id ?? "hot");
  const [selectedSize, setSelectedSize] = useState(sizes[1]?.id ?? sizes[0]?.id ?? "medium");
  const [selectedAddons, setSelectedAddons] = useState([]); // Start unchecked
  const [quantity, setQuantity] = useState(1);

  // Re-sync on product change
  useEffect(() => {
    if (product) {
      const srcTypes = product.types?.length ? product.types : DEFAULT_TYPES;
      const srcSizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
      setSelectedType(srcTypes[0]?.id ?? "hot");
      setSelectedSize(srcSizes[1]?.id ?? srcSizes[0]?.id ?? "medium");
      setSelectedAddons([]);
      setQuantity(1);
    }
  }, [product]);

  // Toggle Add-on
  const handleToggleAddon = (addonId) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  // Reset/Clear Options
  const handleReset = () => {
    setSelectedType("hot");
    setSelectedSize("medium");
    setSelectedAddons([]);
    setQuantity(1);
  };

  // Dynamic Price Calculation
  const finalUnitPrice = useMemo(() => {
    const basePrice = Number(product.price) || 0;
    const sizeObj = sizes.find((s) => String(s.id) === String(selectedSize));
    const sizeDiff = sizeObj ? Number(sizeObj.priceDiff ?? 0) : 0;

    const addonsTotal = selectedAddons.reduce((sum, addonId) => {
      const addon = addons.find((a) => String(a.id) === String(addonId));
      return sum + (addon ? Number(addon.price) || 0 : 0);
    }, 0);

    return Math.max(10, basePrice + sizeDiff + addonsTotal);
  }, [product, selectedSize, selectedAddons, sizes, addons]);

  const totalCalculatedPrice = finalUnitPrice * quantity;

  // Handle Add To Cart and/or open cart
  const handleAddAndProceedToCart = () => {
    const sizeObj = sizes.find((s) => String(s.id) === String(selectedSize));
    const typeObj = types.find((t) => String(t.id) === String(selectedType));
    const addonObjects = selectedAddons
      .map((id) => addons.find((a) => String(a.id) === String(id)))
      .filter(Boolean);

    const customizedItem = {
      ...product,
      id: `${product.id}-${selectedType}-${selectedSize}-${[...selectedAddons].sort().join("-")}`,
      originalId: product.id,
      productId: product.id,
      productSizeId: sizeObj?.productSizeId ?? sizeObj?.id,
      name: product.name,
      price: finalUnitPrice,
      quantity: quantity,
      image: product.image,
      customizations: {
        typeId: selectedType,
        type: typeObj?.name || "ساخن",
        sizeId: sizeObj?.productSizeId ?? sizeObj?.id ?? selectedSize,
        size: sizeObj?.name || "وسط",
        addons: addonObjects.map((addon) => ({ id: addon.productAddonId ?? addon.id, name: addon.name, price: addon.price })),
      },
    };

    if (onAddToCart) {
      onAddToCart(customizedItem);
    }
    if (onOpenCart) {
      onOpenCart();
    } else if (onClose) {
      onClose();
    }
  };

  // Default product image fallback to caramel macchiato cup style
  const productImage = product.image || "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80";

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 1. Header Bar: Back Arrow | 404 COFFEE Logo | Ask Waiter 404 Button */}
        <header className="pd-header-bar">
          <button
            type="button"
            className="pd-back-btn"
            onClick={onClose}
            aria-label="الرجوع للقائمة"
            title="رجوع"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="pd-brand-center">
            <div className="pd-brand-logo-wrap">
              <span className="pd-brand-number">404</span>
              <div className="pd-brand-sub-line">
                <span className="pd-brand-divider"></span>
                <span className="pd-brand-coffee-text">COFFEE</span>
                <span className="pd-brand-divider"></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="pd-ask-waiter-btn"
            onClick={onOpenAiBot}
          >
            <div className="pd-ask-waiter-texts">
              <span className="pd-ask-waiter-title">اسأل ويتر 404</span>
              <span className="pd-ask-waiter-subtitle">مساعدك الذكي</span>
            </div>
            <div className="pd-ask-waiter-icon-wrap">
              <Bot size={15} />
            </div>
          </button>
        </header>

        {/* Scrollable Center Content */}
        <div className="pd-scrollable-body">
          {/* 2. Hero Product Presentation (Split horizontally) */}
          <section className="pd-hero-presentation">
            <div className="pd-hero-cup-stage">
              <img
                src={productImage}
                alt={product.name}
                className="pd-hero-cup-img"
                referrerPolicy="no-referrer"
              />
              <div className="pd-hero-cup-brand-stamp">
                <span className="brand-404">404</span>
                <span className="brand-coffee">COFFEE</span>
              </div>
            </div>

            <div className="pd-hero-text-details">
              <h1 className="pd-hero-title">{product.name}</h1>
              <p className="pd-hero-desc">
                {product.description || "اسبريسو مع حليب مبخر وصلصة كراميل"}
              </p>
              <div className="pd-hero-price-row">
                <span className="pd-hero-price-val">{product.price || 70}</span>
                <span className="pd-hero-price-cur">EGP</span>
              </div>
            </div>
          </section>

          {/* Customization Options Body */}
          <div className="pd-options-body">
            {/* Section 1: النوع */}
            <section className="pd-section-card">
              <div className="pd-section-header">
                <Coffee size={18} className="pd-section-icon" />
                <h3 className="pd-section-title">النوع</h3>
              </div>
              <div className="pd-sugar-pills-row">
                {types.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      type="button"
                      key={type.id}
                      className={`pd-sugar-pill ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      {isSelected && <div className="pd-check-pill"><Check size={10} strokeWidth={3} /></div>}
                      <span>{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section 1: الحجم (Size) */}
            <section className="pd-section-card">
              <div className="pd-section-header">
                <Coffee size={18} className="pd-section-icon" />
                <h3 className="pd-section-title">الحجم</h3>
              </div>

              <div className="pd-sizes-grid">
                {sizes.map((size) => {
                  const isSelected = selectedSize === size.id;
                  return (
                    <div
                      key={size.id}
                      className={`pd-size-card ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedSize(size.id)}
                    >
                      {isSelected && (
                        <div className="pd-check-badge">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                      <span className="pd-size-name">{size.name}</span>
                      <span className="pd-size-volume">{size.volume}</span>
                      {size.priceDiff !== 0 && (
                        <span className="pd-size-price-diff">
                          {size.priceDiff > 0 ? `+${size.priceDiff} EGP` : `${size.priceDiff} EGP`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 4: إضافات (Add-ons) */}
            <section className="pd-section-card">
              <div className="pd-section-header">
                <PlusCircle size={18} className="pd-section-icon" />
                <h3 className="pd-section-title">إضافات</h3>
              </div>

              <div className="pd-addons-grid">
                {addons.map((addon) => {
                  const isSelected = selectedAddons.includes(addon.id);
                  return (
                    <div
                      key={addon.id}
                      className={`pd-addon-card ${isSelected ? "active" : ""}`}
                      onClick={() => handleToggleAddon(addon.id)}
                    >
                      <div className="pd-addon-img-wrap">
                        <img
                          src={addon.image}
                          alt={addon.name}
                          className="pd-addon-thumb"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="pd-addon-title">{addon.name}</span>
                      <span className="pd-addon-price">+{addon.price} EGP</span>
                      <div className="pd-addon-checkbox-box">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 5: الكمية (Quantity Controller) */}
            <section className="pd-section-card pd-quantity-row-card">
              <div className="pd-quantity-controller">
                <button
                  type="button"
                  className="pd-trash-btn"
                  onClick={handleReset}
                  title="إعادة تعيين الخيارات"
                  aria-label="حذف"
                >
                  <Trash2 size={16} />
                </button>

                <button
                  type="button"
                  className="pd-qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="إنقاص الكمية"
                >
                  <Minus size={16} />
                </button>

                <span className="pd-qty-display-number">{quantity}</span>

                <button
                  type="button"
                  className="pd-qty-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="زيادة الكمية"
                >
                  <Plus size={16} />
                </button>
              </div>

              <span className="pd-quantity-label-title">الكمية</span>
            </section>

          </div>
        </div>

        {/* 7. Sticky Bottom Summary & Shopping Cart Bar */}
        <footer className="pd-bottom-action-bar">
          <div className="pd-bottom-summary-info">
            <div className="pd-bottom-count-row">
              <span className="pd-bottom-count-label">عدد المنتجات:</span>
              <span className="pd-bottom-count-badge">{quantity} {quantity === 1 ? "منتج" : "منتجات"}</span>
            </div>
            <div className="pd-bottom-price-main">
              <span className="pd-bottom-price-label">إجمالي السعر:</span>
              <span className="pd-bottom-price-amount">{totalCalculatedPrice}</span>
              <span className="pd-bottom-price-currency">EGP</span>
            </div>
            <span className="pd-bottom-vat-hint">يشمل ضريبة القيمة المضافة</span>
          </div>

          <button
            type="button"
            className="pd-bottom-add-btn"
            onClick={handleAddAndProceedToCart}
          >
            <div className="pd-bottom-add-btn-texts">
              <span className="pd-bottom-add-title">سلة المشتريات</span>
              <span className="pd-bottom-add-table-sub">إضافة ومتابعة الطلب</span>
            </div>
            <div className="pd-cart-icon-wrapper">
              <ShoppingCart size={19} />
              <span className="pd-cart-btn-bubble">{quantity}</span>
            </div>
          </button>
        </footer>
      </div>
    </div>
  );
}
