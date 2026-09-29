import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchSelect from "@/shared/components/SearchSelect/SearchSelect";

describe("searchable material dropdown", () => {
  it("chooses an exact id even when material names match, using keyboard or pointer", () => {
    const selected = vi.fn();
    function Form() {
      const [text, setText] = useState("");
      const [value, setValue] = useState("");
      return <SearchSelect label="المادة" search={text} value={value} onSearch={setText}
        onSelect={(option) => { selected(option.value); setValue(option.value); setText(option.label); }}
        options={[{ value: "a", label: "بن", description: "مورد أول" }, { value: "b", label: "بن", description: "مورد آخر" }]} />;
    }
    render(<Form />);
    const input = screen.getByRole("combobox", { name: "المادة" });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(selected).toHaveBeenLastCalledWith("b");
    expect(input).toHaveAttribute("aria-expanded", "false");
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: "بن مورد أول" }));
    expect(selected).toHaveBeenLastCalledWith("a");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
