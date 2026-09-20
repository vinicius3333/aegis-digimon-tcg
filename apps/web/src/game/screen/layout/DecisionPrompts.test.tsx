// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { I18nProvider } from "../../../i18n";
import { DecisionPrompts } from "./DecisionPrompts";

afterEach(cleanup);

it("reuses the Assembly material overlay for an effect-driven play", () => {
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  render(
    <I18nProvider>
      <DecisionPrompts
        decision={{
          decisionId: "assembly-decision",
          seat: 0,
          kind: "selectCards",
          promptText: "Wizardmon",
          sourceCardId: "BT26-067",
          options: {
            candidateInstanceIds: ["dobermon-trash"],
            visibleInstanceIds: ["dobermon-trash"],
            min: 0,
            max: 1,
            assemblyCardId: "BT26-073",
          },
        }}
        answerOnBoard={false}
        permanents={[]}
        sourceCardId="BT26-067"
        candidates={[{ instanceId: "dobermon-trash", cardId: "BT26-069", zone: "trash" }]}
        allowsPick={() => true}
        picks={[]}
        min={0}
        max={1}
        triggerDetails={[]}
        opponentSelecting={false}
        onTogglePick={() => {}}
        onRespond={onRespond}
        onOpenDialog={() => {}}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("dialog", { name: "＜Assembly＞ Aegiochusmon: Dark" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Dobermon (trash)" }));
  fireEvent.click(screen.getByRole("button", { name: /Assembly \(1 card/ }));
  expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["dobermon-trash"] });
});
