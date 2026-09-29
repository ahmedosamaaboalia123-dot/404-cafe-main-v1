import { useNavigate } from "react-router-dom";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { useTablesBoard } from "../hooks/order.queries";
import "../styles/TablesScreen.css";

export default function TablesScreen() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useTablesBoard();
  const tables = data?.tables || [];

  const openTable = (table) => {
    if (table.occupancy === "OCCUPIED") {
      navigate(`/admin/orders/tables/${table.id}`);
    } else {
      navigate(`/admin/orders/sales/table/${table.id}`);
    }
  };

  return (
    <div className="tables-page">
      <PageHeader title="الطاولات" breadcrumbs={["الطلبات", "الطاولات"]} />
      {error && <p role="alert" className="tables-error">{error?.response?.data?.message || error?.message}</p>}

      {isLoading ? (
        <p className="tables-loading">جاري تحميل الطاولات...</p>
      ) : (
        <div className="tables-grid">
          {tables.map((table) => {
            const isBusy = table.occupancy === "OCCUPIED";
            const disabled = table.occupancy === "OUT_OF_SERVICE";
            return (
              <button
                key={table.id}
                className={`table-card ${isBusy ? "table-card--busy" : ""}`}
                onClick={() => openTable(table)}
                type="button"
                disabled={disabled}
              >
                <span className="table-card__number">{table.tableNumber}</span>
                <span className="table-card__label">
                  {disabled ? "خارج الخدمة" : isBusy ? "مشغول" : "فارغة"}
                </span>
                {isBusy && (
                  <span className="table-card__orders">
                    {table.order?.progress?.ready || 0}/{table.order?.progress?.total || 0} جاهز
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
