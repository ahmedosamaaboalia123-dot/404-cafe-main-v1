import SectionNavDrawer from "@/shared/components/SectionNavDrawer/SectionNavDrawer";

// Kept as a thin wrapper so the customer pages keep their existing import path.
export default function CustomerNavDrawer({
  isOpen,
  onClose,
  onNavigate,
}) {
  return (
    <SectionNavDrawer
      isOpen={isOpen}
      onClose={onClose}
      onNavigate={onNavigate}
      mode="customer"
    />
  );
}
