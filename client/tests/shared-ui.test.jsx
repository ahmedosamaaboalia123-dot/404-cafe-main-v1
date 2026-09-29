import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AsyncState from "@/shared/components/AsyncState/AsyncState";
import ServerPagination from "@/shared/components/ServerPagination/ServerPagination";
import ConfirmAction from "@/shared/components/ConfirmAction/ConfirmAction";
import ConflictDialog from "@/shared/components/ConflictDialog/ConflictDialog";
import Money from "@/shared/components/Money/Money";
import Quantity from "@/shared/components/Quantity/Quantity";
import DateTime from "@/shared/components/DateTime/DateTime";

describe("shared asynchronous UI", () => {
  it("renders loading, error retry, empty, and content states", () => {
    const retry = vi.fn();
    const view = render(<AsyncState loading>content</AsyncState>);
    expect(screen.getByRole("status")).toHaveTextContent("جاري التحميل");
    view.rerender(<AsyncState error={{ message: "فشل محدد" }} onRetry={retry}>content</AsyncState>);
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(retry).toHaveBeenCalledOnce();
    view.rerender(<AsyncState empty>content</AsyncState>);
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument();
    view.rerender(<AsyncState><span>content</span></AsyncState>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("uses server metadata and fixed navigation controls", () => {
    const change = vi.fn();
    render(<ServerPagination meta={{ page: 2, limit: 10, total: 25, pages: 3, hasPrevious: true, hasNext: true }} onPageChange={change}/>);
    fireEvent.click(screen.getByRole("button", { name: "الصفحة السابقة" }));
    fireEvent.click(screen.getByRole("button", { name: "الصفحة التالية" }));
    expect(change.mock.calls).toEqual([[1], [3]]);
    expect(screen.getByText(/إجمالي 25/)).toBeInTheDocument();
  });

  it("requires a reason and prevents duplicate confirmation while pending", () => {
    const confirm = vi.fn();
    const view = render(<ConfirmAction requireReason onConfirm={confirm}>حذف</ConfirmAction>);
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));
    const confirmButton = screen.getByRole("button", { name: "تأكيد" });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "سبب صالح" } });
    fireEvent.click(confirmButton);
    expect(confirm).toHaveBeenCalledWith("سبب صالح");
    view.rerender(<ConfirmAction pending onConfirm={confirm}>حذف</ConfirmAction>);
    expect(screen.getByRole("button", { name: "حذف" })).toBeDisabled();
  });

  it("offers reloading the latest version on conflict", () => {
    const reload = vi.fn();
    render(<ConflictDialog open onReload={reload} onClose={() => {}}/>);
    fireEvent.click(screen.getByRole("button", { name: "تحميل أحدث نسخة" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("safe value presentation", () => {
  it("formats money and quantities without doing business calculations", () => {
    render(<><Money value="1234.50"/><Quantity value="2.125" unit="كجم"/></>);
    expect(screen.getByText((text) => text.includes("١٬٢٣٤٫٥٠") && text.includes("ج.م"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("٢٫١٢٥") && text.includes("كجم"))).toBeInTheDocument();
  });
  it("handles invalid dates safely", () => {
    render(<DateTime value="bad-date"/>);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
