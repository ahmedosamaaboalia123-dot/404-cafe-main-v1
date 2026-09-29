import { 
    createBrowserRouter,
    Navigate
} from "react-router-dom";

import adminRoutes from "@/routes/adminRoutes";
import { customerRoutes } from "@/routes/customerRoutes";
import { tableRoutes } from "@/routes/tableRoutes";
import { authRoutes } from "@/routes/authRoutes";
import RouteErrorPage from "@/shared/components/RouteErrorPage/RouteErrorPage";

const withErrorBoundary = (route) => ({ ...route, errorElement: <RouteErrorPage /> });

const router = createBrowserRouter([
    withErrorBoundary(customerRoutes),
    withErrorBoundary(tableRoutes),
    withErrorBoundary(authRoutes),
    withErrorBoundary(adminRoutes),
    {
        path: "*",
        element: <Navigate to="/" replace />
    }
]);

export default router;
