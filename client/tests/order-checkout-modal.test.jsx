import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrderCheckoutModal from "@/modules/customer/checkout/components/OrderCheckoutModal";

const item = { id: "p1", productSizeId: "s1", name: "لاتيه", price: 50, quantity: 1 };

describe("order checkout confirmation", () => {
  it("keeps the form open and shows the backend error when confirmation fails", async () => {
    const onSubmit = vi.fn(async () => {
      const error = new Error("فشل التأكيد");
      error.response = { data: { error: { messageAr: "الكمية غير متاحة في المخزون" } } };
      throw error;
    });
    render(<OrderCheckoutModal isOpen items={[item]} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("اكتب اسمك"), { target: { value: "أحمد علي" } });
    fireEvent.change(screen.getByPlaceholderText("01xxxxxxxxx"), { target: { value: "01001234567" } });
    fireEvent.click(screen.getByRole("button", { name: "تأكيد وإنشاء الطلب" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("الكمية غير متاحة في المخزون");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("heading", { name: "تأكيد الطلب" })).toBeInTheDocument();
  });
});
