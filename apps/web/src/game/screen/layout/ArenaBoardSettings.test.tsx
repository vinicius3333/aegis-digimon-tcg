// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n";
import { isAutoHatchEnabled, setAutoHatchEnabled } from "../../autoHatch";
import { ArenaBoardSettings } from "./ArenaBoardSettings";

afterEach(cleanup);

it("offers auto hatch disabled by default and applies the match setting", () => {
  localStorage.setItem("aegis.locale", "en");
  setAutoHatchEnabled(false);
  render(
    <I18nProvider>
      <ArenaBoardSettings />
    </I18nProvider>,
  );
  const toggle = screen.getByRole("switch", { name: /^Auto hatch/ });
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(isAutoHatchEnabled()).toBe(true);
  expect(localStorage.getItem("aegis.breeding.auto-hatch")).toBe("true");
  fireEvent.click(toggle);
  expect(isAutoHatchEnabled()).toBe(false);
});
