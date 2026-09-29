import Button from "@/shared/components/Button/Button";
import "./AsyncState.css";

export const LoadingState = ({ text = "جاري التحميل..." }) => <div className="async-state" role="status"><span className="async-state__spinner" />{text}</div>;
export const EmptyState = ({ text = "لا توجد بيانات" }) => <div className="async-state" role="status">{text}</div>;
export const ErrorState = ({ error, onRetry }) => <div className="async-state async-state--error" role="alert"><p>{error?.message || "تعذر تحميل البيانات"}</p>{onRetry && <Button type="button" onClick={onRetry}>إعادة المحاولة</Button>}</div>;

export default function AsyncState({ loading, error, empty, onRetry, loadingText = "جاري التحميل...", emptyText = "لا توجد بيانات", children }) {
  if (loading) return <LoadingState text={loadingText}/>;
  if (error) return <ErrorState error={error} onRetry={onRetry}/>;
  if (empty) return <EmptyState text={emptyText}/>;
  return children;
}
