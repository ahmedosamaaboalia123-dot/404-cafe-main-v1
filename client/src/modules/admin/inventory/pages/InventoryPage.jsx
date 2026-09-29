import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import AddMaterialForm from "../components/AddMaterialForm";
import MaterialsTable from "../components/MaterialsTable";
import WithdrawnMaterialsTable from "../components/WithdrawnMaterialsTable";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";

const INVENTORY_TABS = [
    { id: "raw", label: "المواد الخام" },
    { id: "withdrawn", label: "المواد المسحوبة" }
];

function InventoryPage() {
    const [activeTab, setActiveTab] = useState("raw");
    const queryClient = useQueryClient();
    useRealtimeRoom({
        scope: "inventory:list", rooms: ["admin:orders"], enabled: true,
        onEvent: (event) => {
            if (["order.created", "order.cancelled", "order.completed"].includes(event?.type)) {
                queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
                queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
                queryClient.invalidateQueries({ queryKey: ["warnings"] });
            }
        },
    });

    return (
        <div className="inventory-page">
            <PageHeader
                title="المخزون - المواد الخام"
                breadcrumbs={[
                    "الرئيسية",
                    "المخزون",
                    activeTab === "raw" ? "المواد الخام" : "المواد المسحوبة"
                ]}
                icon={Package}
                tabs={INVENTORY_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="inventory-container">
                {activeTab === "raw" ? (
                    <>
                        <AddMaterialForm />
                        <MaterialsTable />
                    </>
                ) : (
                    <WithdrawnMaterialsTable />
                )}
            </div>
        </div>
    );
}

export default InventoryPage;
