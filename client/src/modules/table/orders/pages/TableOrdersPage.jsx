import React, { useMemo } from "react";
import CustomerOrdersPage from "../../../customer/orders/pages/CustomerOrdersPage";
import { useTable } from "../../context/TableContext";
import { getOrdersByTableNumber } from "../../services/tableOrdersService";

export default function TableOrdersPage() {
  const { tableNumber, tableOrders } = useTable();
  // While the first table refresh is in flight the context list is still empty,
  // so show the locally stored orders to avoid an empty-state flash.
  const localOrders = useMemo(() => getOrdersByTableNumber(tableNumber), [tableNumber]);
  const orders = useMemo(
    () => (tableOrders?.length ? tableOrders : localOrders),
    [tableOrders, localOrders]
  );
  return <CustomerOrdersPage tableMode orders={orders} />;
}
