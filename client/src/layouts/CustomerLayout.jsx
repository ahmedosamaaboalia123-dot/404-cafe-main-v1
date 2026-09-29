import React from "react";
import { Outlet } from "react-router-dom";

export default function CustomerLayout() {
  return (
    <div className="customer-layout-root">
      <Outlet />
    </div>
  );
}
