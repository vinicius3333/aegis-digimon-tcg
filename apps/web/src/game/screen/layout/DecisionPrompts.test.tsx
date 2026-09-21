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

it("reuses the DigiXros material overlay for an effect-driven play", () => {
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  render(
    <I18nProvider>
      <DecisionPrompts
        decision={{
          decisionId: "digixros-decision",
          seat: 0,
          kind: "selectCards",
          promptText: "Hakubamon",
          sourceCardId: "EX12-043",
          options: {
            candidateInstanceIds: ["kakamon-hand"],
            visibleInstanceIds: ["kakamon-hand"],
            min: 0,
            max: 1,
            digiXrosCardId: "EX12-015",
          },
        }}
        answerOnBoard={false}
        permanents={[]}
        sourceCardId="EX12-043"
        candidates={[{ instanceId: "kakamon-hand", cardId: "EX12-006", zone: "hand" }]}
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

  expect(screen.getByRole("dialog", { name: "＜DigiXros＞ Gokuumon" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Resolve effect" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Kakamon \(hand\)/ }));
  fireEvent.click(screen.getByRole("button", { name: /DigiXros \(1 card\)/ }));
  expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["kakamon-hand"] });
});

it("labels a player-only attack target as an attack target instead of a hand selection", () => {
  render(
    <I18nProvider>
      <DecisionPrompts
        decision={{
          decisionId: "attack-target-decision",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Choose an attack target.",
          options: {
            candidateInstanceIds: ["player"],
            selectionContext: "attackTarget",
            min: 1,
            max: 1,
          },
        }}
        answerOnBoard
        permanents={[]}
        sourceCardId={undefined}
        candidates={[{ instanceId: "player" }]}
        allowsPick={() => true}
        picks={[]}
        min={1}
        max={1}
        triggerDetails={[]}
        opponentSelecting={false}
        onTogglePick={() => {}}
        onRespond={() => {}}
        onOpenDialog={() => {}}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("region", { name: "Attack target" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Hand selection" })).toBeNull();
});
