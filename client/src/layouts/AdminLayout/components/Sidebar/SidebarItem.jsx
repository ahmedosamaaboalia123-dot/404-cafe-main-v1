import { NavLink } from "react-router-dom";


import {
    Package,
    ShoppingCart,
    LayoutDashboard,
    AlertTriangle,
    Settings,
    Warehouse,
    FileText,
    BarChart3,
    User,
    Truck,
    RotateCcw,
    Wallet,
    ClipboardList,
    Monitor,
    LayoutGrid,
    History,
    ChefHat,
    UserPlus,
    Bell
} from "lucide-react";

const iconMap = {
    dashboard: LayoutDashboard,
    sales: ShoppingCart,
    products: Package,
    inventory: Warehouse,
    purchases: FileText,
    employees: User,
    suppliers: Truck,
    delegates: Truck,
    settings: Settings,
    warnings: AlertTriangle,
    "purchase-returns": RotateCcw,
    drawer: Wallet,
    orders: ClipboardList,
    "orders-online": Monitor,
    "orders-tables": LayoutGrid,
    "orders-history": History,
    preparation: ChefHat,
    "table-services": Bell,
    customers: UserPlus,
    reports: BarChart3,
    audit: History,
    reviews: ClipboardList,
};





function SidebarItem({item}){


    const Icon =

    iconMap[item.iconKey]
    ||
    Package;




    return (


        <NavLink


            to={

                item.path.startsWith("/admin")

                ?

                item.path

                :

                "/admin" + item.path

            }


            className={({isActive}) =>


                isActive

                ?

                "sidebar-item active"

                :

                "sidebar-item"


            }



        >


            <Icon

                className="sidebar-item__icon"

            />



            <span className="sidebar-item__text">


                {item.pageName}


            </span>



        </NavLink>


    );


}


export default SidebarItem;
