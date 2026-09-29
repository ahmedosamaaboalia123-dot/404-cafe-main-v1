import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";

import router from "./router";
import ApiStatusBanner from "@/shared/components/ApiStatusBanner/ApiStatusBanner";


function App(){

    return (

        <>
            <ApiStatusBanner />
            <Suspense fallback={<div className="route-loading" role="status">جاري تحميل الصفحة...</div>}>
                <RouterProvider router={router} />
            </Suspense>
        </>

    );

}


export default App;
