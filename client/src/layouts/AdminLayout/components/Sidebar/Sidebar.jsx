import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import SidebarItem from "./SidebarItem";

import { useAuthStore } from "@/store/authStore";
import { canSeePage } from "@/modules/auth/permissions/permission";
import { adminNavigation } from "@/modules/auth/permissions/adminNavigation";

import logo from "@/assets/images/404_logo-640.webp";

import "./Sidebar.css";


function Sidebar({ isDesktopOpen = true, isMobileOpen = false, onMobileClose }){


    const permissions = useAuthStore((state) => state.permissions);

    const location = useLocation();

    const orderedPermissions = useMemo(() => {
        const visible = adminNavigation.filter((item) => canSeePage(permissions, item.pageKey));
        const result = visible.filter((item) => !item.section);
        const orderItems = visible.filter((item) => item.section === "الطلبات");
        if (orderItems.length) result.push({ section: "الطلبات", items: orderItems });
        return result;
    }, [permissions]);

    useEffect(() => {
        onMobileClose?.();
    }, [location.pathname]);



    return (

        <aside className={`sidebar ${isDesktopOpen ? "" : "sidebar--collapsed"} ${isMobileOpen ? "sidebar--mobile-open" : ""}`} aria-label="القائمة الرئيسية">


            <div className="sidebar__logo">

                <img
                    className="sidebar__logo__img"
                    src={logo}
                    alt="404"
                />

            </div>


            <nav className="sidebar__menu">

                {
                    orderedPermissions.map((item) => {
                        if (item.section && item.items) {
                            return (
                                <div key={item.section} className="sidebar-section">
                                    <div className="sidebar-section__title">{item.section}</div>
                                    <div className="sidebar-section__items">
                                        {item.items.map((subItem) => (
                                            <SidebarItem key={subItem.id} item={subItem} />
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return <SidebarItem key={item.id} item={item} />;
                    })
                }


            </nav>


        </aside>

    );


}


export default Sidebar;


