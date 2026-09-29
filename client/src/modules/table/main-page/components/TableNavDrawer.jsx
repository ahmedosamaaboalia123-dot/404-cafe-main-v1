import SectionNavDrawer from "@/shared/components/SectionNavDrawer/SectionNavDrawer";
import { useTable } from "../../context/TableContext";

// Kept as a thin wrapper so the table main page keeps its existing import path.
export default function TableNavDrawer({ isOpen, onClose, onNavigate }) {
  const { tableNumber } = useTable();
  return (
    <SectionNavDrawer
      isOpen={isOpen}
      onClose={onClose}
      onNavigate={onNavigate}
      mode="table"
      tableNumber={tableNumber}
    />
  );
}
