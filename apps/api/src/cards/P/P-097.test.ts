import { describe, it, expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./P-097.js";

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
}

function ledgerOf(s: EngineSetup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

const ZUBAMON = "P-097";
const LEGEND_ARMS_HOST = "BT3-008";
const BLACK_NON_LEGEND_ARMS = "BT2-055";

describe("P-097 [On Play] places self under another Digimon and reorders the revealed cards", () => {
  it("exposes top/bottom and ordering decisions, then puts the chosen order on top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEGEND_ARMS_HOST, dp: 3000, as: "host" }],
          hand: [{ card: ZUBAMON, as: "zubamon" }],
          deck: [
            { card: "BT1-009", as: "d0" },
            { card: "BT1-010", as: "d1" },
            { card: "BT1-011", as: "d2" },
            { card: "BT1-009" },
            { card: "BT1-009" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;

    const top3 = [s.inst("d0").instanceId, s.inst("d1").instanceId, s.inst("d2").instanceId];
    const zubamonId = s.inst("zubamon").instanceId;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: zubamonId });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activation = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.options?.choices?.includes("Top of deck") === true), 2_000);

    const destination = s.decisions.findLast(({ req }) => req.options?.choices?.includes("Top of deck"))!.req;
    expect(destination.sourceCardId).toBe("P-097");
    expect(destination.options?.choices).toEqual(["Top of deck", "Bottom of deck"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: destination.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.findLast(({ req }) => req.kind === "orderCards")!.req;
    const chosenOrder = [top3[2]!, top3[0]!, top3[1]!];
    expect(ordering.sourceCardId).toBe("P-097");
    expect(ordering.options?.orderDestination).toBe("deckTop");
    expect(ordering.options?.candidateInstanceIds).toEqual(top3);
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: top3[0]!, cardId: "BT1-009" },
      { instanceId: top3[1]!, cardId: "BT1-010" },
      { instanceId: top3[2]!, cardId: "BT1-011" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("host").stack.some((card) => card.instanceId === zubamonId) &&
        p0.deck[0]?.instanceId === chosenOrder[0] &&
        s.state.memory === 9,
    );

    expect(p0.battleArea.some((p) => p.topCard?.instanceId === zubamonId)).toBe(false);
    expect(s.perm("host").stack.some((c) => c.instanceId === zubamonId)).toBe(true);
    expect(p0.deck.length).toBe(5);
    expect(p0.deck.slice(0, 3).map((card) => card.instanceId)).toEqual(chosenOrder);
    expect(s.state.memory).toBe(9);
  });

  it("may decline the By-cost without moving itself or revealing the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEGEND_ARMS_HOST, as: "host" }],
          hand: [{ card: ZUBAMON, as: "zubamon" }],
          deck: [{ card: "BT1-009", as: "deckTop" }, "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true },
    );
    const topId = s.inst("deckTop").instanceId;
    const zubamonId = s.inst("zubamon").instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: zubamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === zubamonId));
    await settle(() => false, 30);

    expect(s.perm("host").stack.some((card) => card.instanceId === zubamonId)).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(topId);
    expect(s.state.memory).toBe(7);
  });
});

describe("P-097 [Your Turn][Inherited] gains ＜Raid＞ with Legend-Arms or Black Digimon in play", () => {
  it("grants Raid on the host permanent when a Legend-Arms Digimon is in play (inherited)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: LEGEND_ARMS_HOST, dp: 3000, as: "host", under: [ZUBAMON] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
  });

  it("grants Raid when a black Digimon (non-Legend-Arms) is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-015", dp: 4000, as: "host", under: [ZUBAMON] },
          { card: BLACK_NON_LEGEND_ARMS, dp: 3000, as: "blackDigimon" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
  });

  it("does NOT grant Raid when no Legend-Arms or Black Digimon is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", dp: 4000, as: "host", under: [ZUBAMON] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(false);
  });

  it("does NOT grant Raid on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: LEGEND_ARMS_HOST, dp: 3000, as: "host", under: [ZUBAMON] }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(false);
  });
});
