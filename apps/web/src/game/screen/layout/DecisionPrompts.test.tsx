// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CardInstance, Permanent, type DecisionResponse } from "@aegis/shared";
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
        opponentSecurityCount={5}
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
        opponentSecurityCount={5}
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
        opponentSecurityCount={5}
        onTogglePick={() => {}}
        onRespond={() => {}}
        onOpenDialog={() => {}}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("region", { name: "Attack target" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Hand selection" })).toBeNull();
});

it("Discord 1555307552223264829: names the attacker and its only target, and confirms with Attack", () => {
  const grademon = new Permanent();
  grademon.permanentId = "perm-16";
  const top = new CardInstance();
  top.cardId = "EX13-057";
  grademon.topCard = top;
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  render(
    <I18nProvider>
      <DecisionPrompts
        decision={{
          decisionId: "dec-52",
          seat: 0,
          kind: "selectCards",
          promptText: "Choose the attack target for the forced attack.",
          sourceCardId: "EX13-060",
          sourcePermanentId: "perm-16",
          options: { candidateInstanceIds: ["player"], selectionContext: "attackTarget", min: 1, max: 1 },
        }}
        answerOnBoard
        permanents={[grademon]}
        sourceCardId="EX13-060"
        candidates={[{ instanceId: "player" }]}
        allowsPick={() => true}
        picks={["player"]}
        min={1}
        max={1}
        triggerDetails={[]}
        opponentSelecting={false}
        opponentSecurityCount={5}
        onTogglePick={() => {}}
        onRespond={onRespond}
        onOpenDialog={() => {}}
      />
    </I18nProvider>,
  );

  expect(screen.getByText("Grademon attacks. The only target is your opponent's security.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Attack" }));
  expect(onRespond).toHaveBeenCalledWith({ kind: "selectCards", instanceIds: ["player"] });
});

it("shows Taiki and the DigiXros instruction when selecting a material-zone Tamer", () => {
  const effectText = "＜DigiXros＞: Select Tamers to suspend to use additional DigiXros materials, or pass.";
  const { container } = render(
    <I18nProvider>
      <DecisionPrompts
        decision={{
          decisionId: "taiki-digixros",
          seat: 0,
          kind: "selectCards",
          promptText: "Taiki Kudo",
          sourceCardId: "BT10-087",
          options: { candidateInstanceIds: ["taiki"], min: 0, max: 1, effectText },
        }}
        answerOnBoard={true}
        permanents={[]}
        sourceCardId="BT10-087"
        candidates={[{ instanceId: "taiki", cardId: "BT10-087" }]}
        allowsPick={() => true}
        picks={[]}
        min={0}
        max={1}
        triggerDetails={[]}
        opponentSelecting={false}
        opponentSecurityCount={5}
        onTogglePick={() => {}}
        onRespond={() => {}}
        onOpenDialog={() => {}}
      />
    </I18nProvider>,
  );
  expect(screen.getByTestId("board-prompt").textContent).toContain(effectText);
  expect(container.querySelector('img[src*="BT10-087"]')).toBeTruthy();
  expect(container.querySelector('img[src*="P-224"]')).toBeNull();
});

it("asks for a source host on the board, filters its cards, and returns without answering", () => {
  const hosts = ["first", "second"].map((id) => {
    const host = new Permanent();
    host.permanentId = id;
    host.topCard = new CardInstance();
    host.topCard.cardId = "ST1-07";
    host.currentDP = 6000;
    return host;
  });
  const onChooseHost = vi.fn<(permanentId: string) => void>();
  const onChangeHost = vi.fn<() => void>();
  const onRespond = vi.fn<(response: DecisionResponse) => void>();
  const props = {
    decision: {
      decisionId: "source-host",
      seat: 0 as const,
      kind: "selectCards" as const,
      promptText: "Play 1 digivolution card.",
      options: { candidateInstanceIds: ["a", "b"], min: 0, max: 1 },
    },
    answerOnBoard: false,
    permanents: hosts,
    sourceCardId: undefined,
    candidates: [
      { instanceId: "a", cardId: "ST1-03", zone: "digivolutionCards" as const },
      { instanceId: "b", cardId: "ST1-09", zone: "digivolutionCards" as const },
    ],
    allowsPick: () => true,
    picks: [],
    min: 0,
    max: 1,
    triggerDetails: [],
    opponentSelecting: false,
    opponentSecurityCount: 5,
    onTogglePick: vi.fn<(instanceId: string) => void>(),
    onRespond,
    onOpenDialog: vi.fn<() => void>(),
    sourceHost: {
      picking: true,
      cardIds: undefined as ReadonlySet<string> | undefined,
      hostPermanentIds: ["first", "second"],
      onChooseHost,
      onChangeHost,
    },
  };
  const view = render(
    <I18nProvider>
      <DecisionPrompts {...props} />
    </I18nProvider>,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region", { name: "Choose a Digimon" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Greymon/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "View board" }));
  expect(screen.queryByRole("region", { name: "Choose a Digimon" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
  fireEvent.click(screen.getByRole("button", { name: "No Selection" }));
  expect(onRespond).toHaveBeenCalledExactlyOnceWith({ kind: "selectCards", instanceIds: [] });
  expect(onChooseHost).not.toHaveBeenCalled();
  onRespond.mockClear();
  view.rerender(
    <I18nProvider>
      <DecisionPrompts {...props} sourceHost={{ ...props.sourceHost, picking: false, cardIds: new Set(["b"]) }} />
    </I18nProvider>,
  );
  expect(screen.queryByRole("button", { name: /^Agumon/ })).toBeNull();
  expect(screen.getByRole("button", { name: /^MetalGreymon/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /choose.*digimon|change.*digimon/i }));
  expect(onChangeHost).toHaveBeenCalledOnce();
  expect(onRespond).not.toHaveBeenCalled();
});
