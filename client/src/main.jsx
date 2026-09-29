import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";

import { Providers } from "./app/providers";

import AuthBootstrap from "./modules/auth/components/AuthBootstrap";

import "./styles/globals.css";


ReactDOM.createRoot(
    document.getElementById("root")
)
.render(

    <React.StrictMode>

        <Providers>

            <AuthBootstrap><App /></AuthBootstrap>

        </Providers>

    </React.StrictMode>

);
