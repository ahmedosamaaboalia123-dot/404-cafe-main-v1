import React, { useMemo, useState, useEffect } from "react";
import { Bike, MapPin, PackageCheck, Phone, UserRound, X } from "lucide-react";
import { ORDER_FULFILLMENT } from "../services/orderGateway";
import { getCustomerProfile, saveCustomerProfile } from "../services/checkoutCustomerService";
import { customerStorage } from "../../services/customerStorage";
import "../styles/Checkout.css";

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  city: "",
  area: "",
  street: "",
  building: "",
  floor: "",
  landmark: "",
};

export default function OrderCheckoutModal({ isOpen, items = [], onClose, onSubmit, addToExistingOrder = false }) {
  const [fulfillmentType, setFulfillmentType] = useState(ORDER_FULFILLMENT.TAKEAWAY_PICKUP);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Prefill name + phone from the saved customer profile when the modal opens,
  // so the customer's last-used details are ready without re-typing.
  useEffect(() => {
    if (isOpen) {
      const profile = { ...getCustomerProfile(), ...customerStorage.loadProfile() };
      setCustomer((current) => ({ ...current, ...Object.fromEntries(Object.keys(EMPTY_CUSTOMER).map((key) => [key, profile[key] || current[key]])) }));
    }
  }, [isOpen]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
    [items]
  );
  const total = subtotal;

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    if (addToExistingOrder) return items.length > 0;
    const nextErrors = {};
    if (customer.name.trim().length < 2) nextErrors.name = "اكتب الاسم بشكل صحيح";
    if (!/^01\d{9}$/.test(customer.phone.trim())) nextErrors.phone = "رقم الهاتف يجب أن يكون 11 رقمًا";
    if (fulfillmentType === ORDER_FULFILLMENT.ONLINE_DELIVERY) {
      if (!customer.city.trim()) nextErrors.city = "المحافظة أو المدينة مطلوبة";
      if (!customer.area.trim()) nextErrors.area = "المنطقة مطلوبة";
      if (!customer.street.trim()) nextErrors.street = "الشارع مطلوب";
      if (!customer.building.trim()) nextErrors.building = "رقم المبنى مطلوب";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || items.length === 0) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit({ fulfillmentType, customer, items });
      // Save the customer's details so the tracking search + next checkout
      // auto-fill. Keep the data on screen (do not clear the form).
      if (!addToExistingOrder) saveCustomerProfile({ name: customer.name.trim(), phone: customer.phone.trim() });
      setErrors({});
    } catch (error) {
      setSubmitError(
        error?.response?.data?.error?.messageAr ||
          error?.message ||
          "تعذر تأكيد الطلب، راجع البيانات وحاول مرة أخرى"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (name, label, placeholder, Icon = MapPin) => (
    <label className="checkout-field">
      <span>{label}</span>
      <div className={errors[name] ? "checkout-input-wrap has-error" : "checkout-input-wrap"}>
        <Icon size={17} />
        <input value={customer[name]} onChange={(event) => updateField(name, event.target.value)} placeholder={placeholder} />
      </div>
      {errors[name] && <small>{errors[name]}</small>}
    </label>
  );

  return (
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <section className="checkout-modal" onClick={(event) => event.stopPropagation()}>
        <header className="checkout-header">
          <div>
            <h2>تأكيد الطلب</h2>
            <p>اختر طريقة استلام الطلب وأدخل بياناتك</p>
          </div>
          <button type="button" className="checkout-close-btn" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        </header>

        {!addToExistingOrder && <div className="checkout-type-grid">
          <button type="button" className={fulfillmentType === ORDER_FULFILLMENT.TAKEAWAY_PICKUP ? "active" : ""} onClick={() => setFulfillmentType(ORDER_FULFILLMENT.TAKEAWAY_PICKUP)}>
            <PackageCheck size={22} />
            <strong>تيك أواي</strong>
            <span>استلام من الفرع</span>
          </button>
          <button type="button" className={fulfillmentType === ORDER_FULFILLMENT.ONLINE_DELIVERY ? "active" : ""} onClick={() => setFulfillmentType(ORDER_FULFILLMENT.ONLINE_DELIVERY)}>
            <Bike size={22} />
            <strong>أونلاين</strong>
            <span>توصيل إلى عنوانك</span>
          </button>
        </div>}

        {!addToExistingOrder && <div className="checkout-form-grid">
          {field("name", "الاسم", "اكتب اسمك", UserRound)}
          {field("phone", "رقم الهاتف", "01xxxxxxxxx", Phone)}
          {fulfillmentType === ORDER_FULFILLMENT.ONLINE_DELIVERY && (
            <>
              {field("city", "المحافظة أو المدينة", "مثال: البحيرة")}
              {field("area", "المنطقة", "مثال: إيتاي البارود")}
              {field("street", "الشارع", "اسم الشارع")}
              {field("building", "رقم المبنى", "رقم المبنى")}
              {field("floor", "الدور والشقة (اختياري)", "مثال: الدور 3، شقة 6")}
              {field("landmark", "علامة مميزة (اختياري)", "بجوار المحطة")}
            </>
          )}
        </div>}

        <footer className="checkout-footer">
          {submitError && <p className="checkout-submit-error" role="alert">{submitError}</p>}
          <div className="checkout-total"><span>الإجمالي</span><strong>{total} ج.م</strong></div>
          <button type="button" className="checkout-primary-btn" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "جاري الحفظ..." : addToExistingOrder ? "إضافة المنتجات للطلب" : "تأكيد وإنشاء الطلب"}
          </button>
        </footer>
      </section>
    </div>
  );
}
