import React from "react";
import MenuPage from "../../../customer/menu/pages/MenuPage";
import { useTable } from "../../context/TableContext";
import CallWaiterModal from "../../components/CallWaiterModal";

export default function TableMenuPage() {
  const { tableNumber, isWaiterModalOpen, setIsWaiterModalOpen } = useTable();
  return (
    <>
      <MenuPage
        tableMode
        tableNumberOverride={tableNumber}
        onTableRequestWaiter={() => setIsWaiterModalOpen(true)}
      />
      <CallWaiterModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
      />
    </>
  );
}
