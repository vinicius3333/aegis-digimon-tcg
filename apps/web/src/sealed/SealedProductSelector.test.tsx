import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SealedProductSelector } from "@/sealed/SealedProductSelector";

afterEach(cleanup);
it("keeps the selector compact with release and support information in optional details", () => {
  const onChange = vi.fn<(setId: string) => void>();
  render(
    <I18nProvider>
      <SealedProductSelector value="EX13" onChange={onChange} />
    </I18nProvider>,
  );
  const select = screen.getByRole("combobox", { name: "Booster series" }) as HTMLSelectElement;
  expect(select.value).toBe("EX13");
  expect(screen.getByRole("img").getAttribute("src")).toBe("/sets/EX13.jpg");
  expect(screen.getByText("6 packs")).toBeTruthy();
  const details = screen.getByText("Details").closest("details")!;
  expect(details.open).toBe(false);
  expect(details.textContent).toContain("English / world");
  expect(details.textContent).toContain("estimated");
  expect(screen.queryByText("DIGIMON LIBERATOR", { selector: "strong" })).toBeNull();
  expect(screen.queryByText(/creator chooses/i)).toBeNull();
  fireEvent.click(screen.getByText("Details"));
  expect(details.open).toBe(true);
  expect((screen.getByRole("option", { name: /BT27/ }) as HTMLOptionElement).disabled).toBe(true);
  expect((screen.getByRole("option", { name: /BT26/ }) as HTMLOptionElement).disabled).toBe(false);
  fireEvent.change(select, { target: { value: "BT26" } });
  expect(onChange).toHaveBeenCalledWith("BT26");
});
