// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { AppFusionChoiceOverlay } from "./AppFusionChoiceOverlay";

afterEach(() => cleanup());

const routes = [
  { linkedInstanceId: "first-instance", linkedCardId: "BT23-039", projectedCost: 0 },
  { linkedInstanceId: "second-instance", linkedCardId: "BT23-007", projectedCost: 1 },
];

function renderOverlay(overrides: Partial<ComponentProps<typeof AppFusionChoiceOverlay>> = {}) {
  return render(
    <I18nProvider>
      <AppFusionChoiceOverlay
        resultCardId="BT23-021"
        hostCardId="BT23-016"
        routes={routes}
        onConfirm={vi.fn<(linkedInstanceId: string) => void>()}
        onCancel={vi.fn<() => void>()}
        {...overrides}
      />
    </I18nProvider>,
  );
}

it("confirms the exact selected physical second material and displays its cost", () => {
  const onConfirm = vi.fn<(linkedInstanceId: string) => void>();
  renderOverlay({ onConfirm });
  fireEvent.click(screen.getByLabelText(/Musclemon/));
  fireEvent.click(screen.getByRole("button", { name: "App Fuse" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onConfirm).toHaveBeenCalledWith("second-instance");
  expect(screen.getByText("Cost: 1")).toBeTruthy();
});

it("cancels without sending a fusion intent and supports normal evolution", () => {
  const onConfirm = vi.fn<(linkedInstanceId: string) => void>();
  const onCancel = vi.fn<() => void>();
  const onNormalEvolution = vi.fn<() => void>();
  renderOverlay({ onConfirm, onCancel, onNormalEvolution });
  fireEvent.click(screen.getByRole("button", { name: "Digivolve normally" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onNormalEvolution).toHaveBeenCalledOnce();
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onConfirm).not.toHaveBeenCalled();
});

it("reports no legal material and blocks confirmation when every route is gone", () => {
  const onConfirm = vi.fn<(linkedInstanceId: string) => void>();
  renderOverlay({ onConfirm, routes: [] });
  expect(screen.getByRole("status").textContent).toBe("No legal linked material is available.");
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  const confirm = screen.getByRole("button", { name: "App Fuse" }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.click(confirm);
  expect(onConfirm).not.toHaveBeenCalled();
});

it("cancels on Escape and clears a selected route that disappears", () => {
  const onConfirm = vi.fn<(linkedInstanceId: string) => void>();
  const onCancel = vi.fn<() => void>();
  const view = renderOverlay({ onConfirm, onCancel });
  const second = screen.getByLabelText(/Musclemon/) as HTMLInputElement;
  fireEvent.click(second);
  view.rerender(
    <I18nProvider>
      <AppFusionChoiceOverlay
        resultCardId="BT23-021"
        hostCardId="BT23-016"
        routes={[routes[0]!]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );
  expect((screen.getByRole("radio", { name: /Perorimon/ }) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole("button", { name: "App Fuse" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onConfirm).not.toHaveBeenCalled();
});
