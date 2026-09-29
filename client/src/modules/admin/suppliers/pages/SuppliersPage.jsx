import { Truck } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import AddSupplierForm from "../components/AddSupplierForm";
import SuppliersTable from "../components/SuppliersTable";

function SuppliersPage() {
    return (
        <div className="suppliers-page">
            <PageHeader
                title="الموردين"
                breadcrumbs={["الرئيسية", "الموردين"]}
                icon={Truck}
            />

            <div style={{ padding: "20px 24px" }}>
                <AddSupplierForm />
                <SuppliersTable />
            </div>
        </div>
    );
}

export default SuppliersPage;
