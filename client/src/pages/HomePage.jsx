import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Coffee, LayoutDashboard } from "lucide-react";
import "./HomePage.css";

function HomePage() {
    return (
        <div className="home-page-container">
            <div className="home-card">
                <div className="brand-badge">
                    <Coffee size={32} className="brand-icon" />
                    <span className="brand-name">404 COFFEE</span>
                </div>

                <h1 className="home-title">نظام إدارة المقاهي والإنتاج</h1>
                <p className="home-description">
                    مرحباً بك في المنصة الموحدة لإدارة المبيعات، المخزون، والمواد الخام لمقهى 404 Coffee.
                </p>

                <div className="home-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <Link to="/table/4" className="go-to-admin-btn" style={{ backgroundColor: 'var(--primary, #6B3F1D)', color: '#fff' }}>
                        <Coffee size={20} />
                        <span>قسم الطاولات الحية (طاولة رقم 4 - Dine-In)</span>
                        <ArrowLeft size={18} className="arrow-icon" />
                    </Link>
                    <Link to="/customer" className="go-to-admin-btn" style={{ backgroundColor: '#FAF6F0', color: '#2B211B', border: '1.5px solid #EDE3DA' }}>
                        <Coffee size={20} />
                        <span>تطبيق العملاء الأونلاين والتوصيل</span>
                        <ArrowLeft size={18} className="arrow-icon" />
                    </Link>
                    <Link to="/admin/dashboard" className="go-to-admin-btn" style={{ backgroundColor: 'var(--surface-soft, #F8F3ED)', color: 'var(--text-main, #2B211B)', border: '1px solid var(--border-main, #EDE3DA)' }}>
                        <LayoutDashboard size={20} />
                        <span>الانتقال إلى لوحة التحكم (الأدمن)</span>
                        <ArrowLeft size={18} className="arrow-icon" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default HomePage;
