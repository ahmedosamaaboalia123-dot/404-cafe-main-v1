import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { queryKeys } from "@/api/queryKeys";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import CreateGroupForm from "../components/CreateGroupForm";
import GroupsTable from "../components/GroupsTable";
import GroupDetails from "../components/GroupDetails";
import "./PurchasesPage.css";

export default function PurchasesPage() {
  const permissions = useAuthStore((state) => state.permissions);
  const canCreate = can(permissions, "purchases.manage");
  const [activeTab, setActiveTab] = useState(canCreate ? "create" : "groups");
  const [openGroupId, setOpenGroupId] = useState(null);
  const queryClient = useQueryClient();

  useRealtimeRoom({
    scope: "purchases:list",
    rooms: ["admin:purchases"],
    enabled: true,
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    },
  });

  const openDetails = (id) => setOpenGroupId(String(id));
  const closeDetails = () => setOpenGroupId(null);

  return (
    <div className="purchases-page">
      <PageHeader title="المشتريات" breadcrumbs={["الرئيسية", "المشتريات"]} icon={ShoppingCart} />
      <div className="purchases-page__container">
        {openGroupId ? (
          <GroupDetails groupId={openGroupId} onBack={closeDetails} />
        ) : (
          <>
            <div className="purchases-tabs" role="tablist" aria-label="أقسام المشتريات">
              {canCreate && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "create"}
                  className={`purchases-tab-btn ${activeTab === "create" ? "active" : ""}`}
                  onClick={() => setActiveTab("create")}
                >
                  إنشاء مجموعة شراء
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "groups"}
                className={`purchases-tab-btn ${activeTab === "groups" ? "active" : ""}`}
                onClick={() => setActiveTab("groups")}
              >
                مجموعات الشراء
              </button>
            </div>
            {activeTab === "create" && canCreate ? (
              <CreateGroupForm onCreated={openDetails} />
            ) : (
              <GroupsTable onOpen={openDetails} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
