import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DelegateForm from "@/modules/admin/delegates/components/DelegateForm";

describe("DelegateForm", () => {
  it("creates with name, phone and numeric capacity", async () => {
    const onSubmit = vi.fn(async () => ({}));
    render(<DelegateForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("اسم المندوب"), { target: { value: "مندوب جديد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف وواتساب"), { target: { value: "01000000009" } });
    fireEvent.change(screen.getByLabelText("السعة القصوى للطلبات"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /إضافة المندوب/ }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: "مندوب جديد", phone: "01000000009", maxActiveOrders: 7 });
  });

  it("edits without sending the immutable phone", async () => {
    const onSubmit = vi.fn(async () => ({}));
    render(
      <DelegateForm
        initial={{ name: "كريم", phone: "01000000001", maxActiveOrders: 5 }}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );
    expect(screen.getByLabelText("رقم الهاتف وواتساب")).toBeDisabled();
    expect(screen.getByRole("button", { name: /حفظ التعديلات/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("اسم المندوب"), { target: { value: "كريم عادل" } });
    fireEvent.click(screen.getByRole("button", { name: /حفظ التعديلات/ }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const [body] = onSubmit.mock.calls[0];
    expect(body).toEqual({ name: "كريم عادل", maxActiveOrders: 5 });
    expect(body).not.toHaveProperty("phone");
  });
});
