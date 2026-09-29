import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PanelRightClose, PanelRightOpen } from "lucide-react";


import UserMenu from "./components/UserMenu";
import LiveClock from "./components/LiveClock";
import MenuButton from "./components/MenuButton";

const ROUTE_TITLES = {
  "/admin/dashboard": "لوحة التحكم",
  "/admin/warnings": "إدارة التحذيرات",
  "/admin/audit": "سجل التدقيق",
  "/admin/employees": "الموظفون",
  "/admin/drawer": "الدرج",
  "/admin/customers": "إدارة العملاء",
  "/admin/delegates": "المناديب",
  "/admin/invoices": "فواتير الطلبات",
  "/admin/inventory": "المخزون - المواد الخام",
  "/admin/products": "المنتجات",
  "/admin/suppliers": "الموردين",
  "/admin/purchases": "المشتريات",
  "/admin/returns": "مرتجعات المشتريات",
  "/admin/financial-reports": "التقارير المالية",
  "/admin/reviews": "التقييمات",
  "/admin/orders": "نظام إدارة المطعم",
  "/admin/orders/online": "طلبات الأونلاين والتيك أواي",
  "/admin/orders/takeaway": "طلبات التيك أواي",
  "/admin/orders/tables": "الطاولات",
  "/admin/orders/table-services": "خدمات الطاولات",
  "/admin/orders/preparation": "قسم التحضير",
  "/admin/orders/history": "سجل الطلبات",
  "/admin/orders/cancellations": "طلبات إلغاء الأوردرات",
  "/admin/orders/table-proposals": "طلبات الطاولات الجديدة",
};


import "./Header.css";



function Header({ onMenuToggle, isMobileSidebarOpen, onDesktopSidebarToggle, isDesktopSidebarOpen }){

    const location = useLocation();
    const [overrideTitle, setOverrideTitle] = useState(null);
    useEffect(() => { setOverrideTitle(null); }, [location.pathname]);
    useEffect(() => {
      const handler = (e) => setOverrideTitle(e.detail || null);
      window.addEventListener("page-title", handler);
      return () => window.removeEventListener("page-title", handler);
    }, []);
    const staticTitle = ROUTE_TITLES[location.pathname] || ROUTE_TITLES[location.pathname.replace(/\/\d+.*/, "")] || null;
    const title = overrideTitle || staticTitle || "";

    return (


        <header className="header">


            {/* Left Section */}

            <div className="header__left">


                <UserMenu/>


            </div>





            {/* Center Section */}

            <div className="header__center">

                {title && <h1 className="header__title">{title}</h1>}

                <LiveClock/>

            </div>





            {/* Right Section */}

            <div className="header__right">

                <MenuButton onClick={onMenuToggle} isOpen={isMobileSidebarOpen}/>

                <button
                    type="button"
                    className="desktop-sidebar-toggle"
                    onClick={onDesktopSidebarToggle}
                    aria-label={isDesktopSidebarOpen ? "تصغير القائمة الجانبية" : "توسيع القائمة الجانبية"}
                    title={isDesktopSidebarOpen ? "تصغير القائمة" : "توسيع القائمة"}
                >
                    {isDesktopSidebarOpen ? <PanelRightClose/> : <PanelRightOpen/>}
                </button>


            </div>



        </header>


    );


}


export default Header;
