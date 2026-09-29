import React from "react";
import { Outlet } from "react-router-dom";
import { TableProvider } from "@/modules/table/context/TableContext";

export default function TableLayout() {
  return (
    <TableProvider>
      <Outlet />
    </TableProvider>
  );
}
