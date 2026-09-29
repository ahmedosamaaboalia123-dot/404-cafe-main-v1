import { lazy } from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute";




const LayoutAdmin = lazy(() => import("@/layouts/AdminLayout/LayoutAdmin"));


const DashboardPage = lazy(() => import("@/modules/admin/dashboard/pages/DashboardPage"));
const ProductsPage = lazy(() => import("@/modules/admin/products/pages/ProductsPage"));
const InventoryPage = lazy(() => import("@/modules/admin/inventory/pages/InventoryPage"));
const MaterialDetailsPage = lazy(() => import("@/modules/admin/inventory/pages/MaterialDetailsPage"));
const PurchasesPage = lazy(() => import("@/modules/admin/purchases/pages/PurchasesPage"));
const EmployeesPage = lazy(() => import("@/modules/admin/employees/pages/EmployeesPage"));
const EmployeeDetailsPage = lazy(() => import("@/modules/admin/employees/pages/EmployeeDetailsPage"));
const SuppliersPage = lazy(() => import("@/modules/admin/suppliers/pages/SuppliersPage"));
const SupplierDetailsPage = lazy(() => import("@/modules/admin/suppliers/pages/SupplierDetailsPage"));
const WarningsPage = lazy(() => import("@/modules/admin/warnings/pages/WarningsPage"));
const InvoicesPage = lazy(() => import("@/modules/admin/invoices/pages/InvoicesPage"));
const ReturnsPage = lazy(() => import("@/modules/admin/returns/pages/ReturnsPage"));
const DrawerPage = lazy(() => import("@/modules/admin/drawer/pages/DrawerPage"));
const FinancialReportsPage = lazy(() => import("@/modules/admin/financial-reports/pages/FinancialReportsPage"));
const OrdersHomePage = lazy(() => import("@/modules/admin/orders/pages/OrdersHomePage"));
const OnlineScreen = lazy(() => import("@/modules/admin/orders/pages/OnlineScreen"));
const TakeawayScreen = lazy(() => import("@/modules/admin/orders/pages/TakeawayScreen"));
const TablesScreen = lazy(() => import("@/modules/admin/orders/pages/TablesScreen"));
const OrderSalesPage = lazy(() => import("@/modules/admin/orders/pages/SalesPage"));
const BusyCardPage = lazy(() => import("@/modules/admin/orders/pages/BusyCardPage"));
const PreparationPage = lazy(() => import("@/modules/admin/orders/pages/PreparationPage"));
const OrderDetailsPage = lazy(() => import("@/modules/admin/orders/pages/OrderDetailsPage"));
const OrderHistoryPage = lazy(() => import("@/modules/admin/orders/pages/OrderHistoryPage"));
const CancellationRequestsPage = lazy(() => import("@/modules/admin/orders/pages/CancellationRequestsPage"));
const TableProposalsPage = lazy(() => import("@/modules/admin/orders/pages/TableProposalsPage"));
const TableServicesPage = lazy(() => import("@/modules/admin/orders/pages/TableServicesPage"));
const TableSummaryPage = lazy(() => import("@/modules/admin/orders/pages/TableSummaryPage"));
const TableOrderTrackPage = lazy(() => import("@/modules/admin/orders/pages/TableOrderTrackPage"));
const CustomersPage = lazy(() => import("@/modules/admin/customers/pages/CustomersPage"));
const CustomerDetailsPage = lazy(() => import("@/modules/admin/customers/pages/CustomerDetailsPage"));
const DelegatesPage = lazy(() => import("@/modules/admin/delegates/pages/DelegatesPage"));
const DelegateDetailsPage = lazy(() => import("@/modules/admin/delegates/pages/DelegateDetailsPage"));
const AuditPage = lazy(() => import("@/modules/admin/audit/pages/AuditPage"));
const ReviewsPage = lazy(() => import("@/modules/admin/reviews/pages/ReviewsPage"));





const adminRoutes = {


    path:"/admin",


    element:<ProtectedRoute><LayoutAdmin/></ProtectedRoute>,


    children:[


        {

            index:true,

            element:<Navigate to="/admin/dashboard" replace/>

        },
        {

            path:"dashboard",

            element:<ProtectedRoute pageKey="dashboard"><DashboardPage/></ProtectedRoute>

        },



        {

            path:"products",

            element:<ProtectedRoute pageKey="products"><ProductsPage/></ProtectedRoute>

        },


        {

            path:"inventory",

            element:<ProtectedRoute pageKey="inventory"><InventoryPage/></ProtectedRoute>

        },


        {

            path:"inventory/:id",

            element:<ProtectedRoute pageKey="inventory"><MaterialDetailsPage/></ProtectedRoute>

        },


        {

            path:"warnings",

            element:<ProtectedRoute pageKey="warnings"><WarningsPage/></ProtectedRoute>

        },


        {

            path:"invoices",

            element:<ProtectedRoute pageKey="orders"><InvoicesPage/></ProtectedRoute>

        },


        {

            path:"purchases",

            element:<ProtectedRoute pageKey="purchases"><PurchasesPage/></ProtectedRoute>

        },


        {

            path:"employees",

            element:<ProtectedRoute pageKey="employees"><EmployeesPage/></ProtectedRoute>

        },


        {

            path:"employees/:id",

            element:<ProtectedRoute pageKey="employees"><EmployeeDetailsPage/></ProtectedRoute>

        },


        {

            path:"suppliers",

            element:<ProtectedRoute pageKey="suppliers"><SuppliersPage/></ProtectedRoute>

        },


        {

            path:"suppliers/:id",

            element:<ProtectedRoute pageKey="suppliers"><SupplierDetailsPage/></ProtectedRoute>

        },


        {

            path:"returns",

            element:<ProtectedRoute pageKey="purchase-returns"><ReturnsPage/></ProtectedRoute>

        },


        {

            path:"drawer",

            element:<ProtectedRoute pageKey="drawer"><DrawerPage/></ProtectedRoute>

        },
        { path:"financial-reports", element:<ProtectedRoute pageKey="reports"><FinancialReportsPage/></ProtectedRoute> },
        { path:"audit", element:<ProtectedRoute pageKey="audit"><AuditPage/></ProtectedRoute> },
        { path:"reviews", element:<ProtectedRoute pageKey="reviews"><ReviewsPage/></ProtectedRoute> },
        {
            path:"delegates",
            children: [
                { index: true, element: <ProtectedRoute pageKey="delegates"><DelegatesPage/></ProtectedRoute> },
                { path: ":id", element: <ProtectedRoute pageKey="delegates"><DelegateDetailsPage/></ProtectedRoute> },
            ]
        },


        {

            path:"orders",

            children: [

                { index: true, element: <ProtectedRoute pageKey="orders"><OrdersHomePage /></ProtectedRoute> },

                { path: "online", element: <ProtectedRoute pageKey="orders"><OnlineScreen/></ProtectedRoute> },

                { path: "takeaway", element: <ProtectedRoute pageKey="orders"><TakeawayScreen/></ProtectedRoute> },

                { path: "tables", element: <ProtectedRoute pageKey="tables"><TablesScreen/></ProtectedRoute> },

                { path: "tables/:tableNumber", element: <ProtectedRoute pageKey="tables"><TableSummaryPage/></ProtectedRoute> },

                { path: "tables/:tableNumber/order/:orderId/track", element: <ProtectedRoute pageKey="tables"><TableOrderTrackPage/></ProtectedRoute> },

                { path: "sales/:type/:id", element: <ProtectedRoute pageKey="orders"><OrderSalesPage /></ProtectedRoute> },

                { path: "busy/:type/:id", element: <ProtectedRoute pageKey="orders"><BusyCardPage /></ProtectedRoute> },

                { path: "preparation", element: <ProtectedRoute pageKey="preparation"><PreparationPage/></ProtectedRoute> },

                { path: "preparation/:orderId", element: <ProtectedRoute pageKey="preparation"><OrderDetailsPage/></ProtectedRoute> },

                { path: "history", element: <ProtectedRoute pageKey="orders"><OrderHistoryPage/></ProtectedRoute> },
                { path: "cancellations", element: <ProtectedRoute pageKey="orders"><CancellationRequestsPage/></ProtectedRoute> },
                { path: "table-proposals", element: <ProtectedRoute pageKey="tables"><TableProposalsPage/></ProtectedRoute> },

                { path: "table-services", element: <ProtectedRoute pageKey="table-services"><TableServicesPage/></ProtectedRoute> },

            ]

        },


        {

            path:"customers",

            children: [

                { index: true, element: <ProtectedRoute pageKey="customers"><CustomersPage/></ProtectedRoute> },

                { path: ":id", element: <ProtectedRoute pageKey="customers"><CustomerDetailsPage/></ProtectedRoute> },

            ]

        }


    ]


};


export default adminRoutes;



