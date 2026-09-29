import { useNavigate } from "react-router-dom";
import { Monitor, LayoutGrid, ShoppingBag, History, ReceiptText, CircleX } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import "../styles/OrdersHomePage.css";

function OrdersHomePage() {
    const navigate = useNavigate();

    return (
        <div className="orders-home-page">
            <PageHeader
                title="نظام إدارة المطعم"
                breadcrumbs={["الرئيسية", "الطلبات"]}
            />
            <div className="orders-home-content">
                <div className="orders-home-grid">
                    <div className="orders-home-card" onClick={() => navigate("/admin/orders/preparation")}><Monitor size={64}/><h2>قسم التحضير</h2></div>
                    <div className="orders-home-card" onClick={() => navigate("/admin/orders/history")}><History size={64}/><h2>سجل الطلبات</h2></div>
                    <div className="orders-home-card" onClick={() => navigate("/admin/invoices")}><ReceiptText size={64}/><h2>فواتير الطلبات</h2></div>
                    <div className="orders-home-card" onClick={() => navigate("/admin/orders/cancellations")}><CircleX size={64}/><h2>طلبات الإلغاء</h2></div>
                    <div className="orders-home-card" onClick={() => navigate("/admin/orders/table-proposals")}><LayoutGrid size={64}/><h2>طلبات جرسون الطاولات</h2></div>
                    <div
                        className="orders-home-card orders-home-card--online"
                        onClick={() => navigate("/admin/orders/online")}
                    >
                        <Monitor size={64} />
                        <h2>شاشة الأونلاين</h2>
                    </div>
                    <div
                        className="orders-home-card orders-home-card--takeaway"
                        onClick={() => navigate("/admin/orders/takeaway")}
                    >
                        <ShoppingBag size={64} />
                        <h2>طلبات التيك أواي</h2>
                    </div>
                    <div
                        className="orders-home-card orders-home-card--tables"
                        onClick={() => navigate("/admin/orders/tables")}
                    >
                        <LayoutGrid size={64} />
                        <h2>شاشة الطربيزات</h2>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrdersHomePage;
