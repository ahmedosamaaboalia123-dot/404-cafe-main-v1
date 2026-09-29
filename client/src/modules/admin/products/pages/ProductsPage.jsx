import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { queryKeys } from "@/api/queryKeys";
import ProductsTable from "../components/ProductsTable";
import ProductWizard from "../components/ProductWizard";
import CategoryManager from "../components/CategoryManager";
import ProductDetails from "../components/ProductDetails";
import "./ProductsPage.css";

export default function ProductsPage() {
  const permissions = useAuthStore((state) => state.permissions);
  // The backend exposes one write permission for the complete products module.
  // Using products.create here hid the old create forms because that permission
  // does not exist in the backend contract.
  const canManage = can(permissions, "products.manage");
  const [tab, setTab] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const queryClient = useQueryClient();

  useRealtimeRoom({
    scope: "products:list",
    rooms: ["admin:products"],
    enabled: true,
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const tabs = [
    { id: "list", label: "قائمة المنتجات" },
    ...(canManage ? [{ id: "create", label: "إضافة منتج" }] : []),
    { id: "categories", label: canManage ? "إضافة قسم والأقسام" : "الأقسام" },
  ];

  const openDetails = (id) => setSelectedId(String(id));
  const closeDetails = () => setSelectedId(null);

  const activeTab = tabs.some((item) => item.id === tab) ? tab : "list";

  return (
    <div className="products-page">
      <PageHeader
        title="المنتجات"
        breadcrumbs={["الإدارة", "المنتجات"]}
        tabs={selectedId ? [] : tabs}
        activeTab={activeTab}
        onTabChange={setTab}
      />
      <div className="products-page-container">
        {selectedId ? (
          <ProductDetails productId={selectedId} onBack={closeDetails} />
        ) : activeTab === "create" && canManage ? (
          <ProductWizard
            onFinished={(id) => {
              setSelectedId(String(id));
              setTab("list");
            }}
          />
        ) : activeTab === "categories" ? (
          <CategoryManager />
        ) : (
          <ProductsTable onOpen={openDetails} />
        )}
      </div>
    </div>
  );
}
