// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getCompiledCard, type DecisionResponse } from "@aegis/shared";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { ActionConfirmationOverlay } from "./overlay/choice/ActionConfirmationOverlay";
import { AssemblyMaterialOverlay } from "./overlay/choice/AssemblyMaterialOverlay";
import { DecisionOverlay } from "./overlay/choice/DecisionOverlay";

afterEach(cleanup);

it("shows Divine Arms' linked leave-prevention clause in its optional dialog", () => {
  const protection = getCompiledCard("BT25-101")!.effects.find(
    (effect) => effect.isLinked && effect.actions.some((action) => action.kind === "Replacement"),
  )!;
  const replacement = protection.actions.find((action) => action.kind === "Replacement")!;
  render(
    <I18nProvider>
      <DecisionOverlay
        request={{
          decisionId: "divine-arms-prevention",
          seat: 0,
          kind: "optional",
          sourceCardId: "BT25-101",
          promptText: "Prevent leaving the battle area?",
          options: {
            timing: protection.timingOverride ?? protection.trigger,
            effectText: replacement.raw,
          },
        }}
        sourceCardId="BT25-101"
        candidates={[]}
        picks={[]}
        onTogglePick={vi.fn<(instanceId: string) => void>()}
        onRespond={vi.fn<(response: DecisionResponse) => void>()}
      />
    </I18nProvider>,
  );
  expect(
    screen.getByText(
      "[All Turns] When this [Vulcanusmon] would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/Use Req\./)).toBeNull();
});

it("lets action confirmation inspect the board without executing or cancelling", () => {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nProvider>
      <ActionConfirmationOverlay
        cardId="BT1-010"
        title="Play card"
        detail="Pay its play cost."
        confirmLabel="Play"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "View board" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
  expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Play card" }));
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

it("retains Assembly material selection and order while inspecting the board", () => {
  const onConfirm = vi.fn<(instanceIds: string[]) => void>();
  const onSkip = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nProvider>
      <AssemblyMaterialOverlay
        playingCardId="BT1-010"
        requirements={[{ reduceCost: 2, materials: [{ count: 1, namesExact: ["Agumon"] }] }]}
        candidates={[{ instanceId: "agumon-trash", cardId: "BT1-010" }]}
        onConfirm={onConfirm}
        onSkip={onSkip}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Agumon (trash)" }));
  fireEvent.click(screen.getByRole("button", { name: "View board" }));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onSkip).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
  expect(screen.getByRole("button", { name: "Agumon (trash)" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: /Assembly \(1/ }));
  expect(onConfirm).toHaveBeenCalledWith(["agumon-trash"]);
});
