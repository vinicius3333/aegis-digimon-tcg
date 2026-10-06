// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SecurityShieldPile } from "./SecurityShieldPile";
import { Side } from "../side";

afterEach(cleanup);

it("starts a distinct animation surface for consecutive reactions without an idle render", () => {
  const view = (landing?: number) => (
    <SecurityShieldPile count={3} label="Security" shield={Side.Viewer} landing={landing} />
  );
  const { getByRole, rerender } = render(view(1));
  const first = getByRole("img", { name: "Security · 3" });
  rerender(view(2));
  const second = getByRole("img", { name: "Security · 3" });
  expect(second).not.toBe(first);
  expect(second.getAttribute("data-security-landing-key")).toBe("2");
  rerender(view());
  expect(getByRole("img", { name: "Security · 3" })).toBe(second);
  expect(second.classList.contains("game-security-shield--landing")).toBe(false);
});
