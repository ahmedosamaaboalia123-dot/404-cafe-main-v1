import { useState } from "react";
import {Outlet} from "react-router-dom";


import Header from "./components/Header/Header";

import Sidebar from "./components/Sidebar/Sidebar";



function LayoutAdmin(){

const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);


return (

<div className="admin-layout">


<Sidebar
    isDesktopOpen={isDesktopSidebarOpen}
    isMobileOpen={isMobileSidebarOpen}
    onMobileClose={() => setIsMobileSidebarOpen(false)}
/>

<button
    type="button"
    className={`admin-sidebar-backdrop ${isMobileSidebarOpen ? "is-visible" : ""}`}
    onClick={() => setIsMobileSidebarOpen(false)}
    aria-label="إغلاق القائمة الجانبية"
/>


<div className="admin-main">


<Header
    isDesktopSidebarOpen={isDesktopSidebarOpen}
    onDesktopSidebarToggle={() => setIsDesktopSidebarOpen((open) => !open)}
    isMobileSidebarOpen={isMobileSidebarOpen}
    onMenuToggle={() => setIsMobileSidebarOpen((open) => !open)}
/>


<main>

<Outlet/>

</main>


</div>


</div>

)

}


export default LayoutAdmin;
