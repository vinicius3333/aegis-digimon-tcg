import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./EX3-062.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
}

function payload(s: EngineSetup): DecisionPayload {
  return JSON.parse(s.state.pendingDecision!.payloadJson) as DecisionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  expect(
    s.engine.applyIntent(s.state.pendingDecision!.seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

async function acceptOptionalPlay(s: EngineSetup): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(s.state.pendingDecision?.kind).toBe("optional");
  expect(s.decisions.at(-1)!.req).toMatchObject({
    kind: "optional",
    sourceCardId: "EX3-062",
    options: { timing: "WhenDigivolving" },
  });
  expect(payload(s).effectText).toContain("if either player has 5 or more cards in their trash");
  respond(s, { kind: "optional", accept: true });
}

describe("EX3-062 WarGrowlmon", () => {
  it("matches its official identity, printed evolution, alternate Growlmon evolution, and text", async () => {
    const definition = getCardDefinition("EX3-062")!;
    expect(definition).toMatchObject({
      cardId: "EX3-062",
      nameEn: "WarGrowlmon",
      colors: ["Purple", "Red"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      rarity: "U",
    });
    expect(definition.evoCosts).toEqual([{ color: "Purple", level: 4, memoryCost: 4 }]);
    expect(definition.effectText).toContain("Digivolve: 3 from Lv.4 if name contains [Growlmon]");
    expect(definition.effectText).toContain("Trash the top 3 cards of both players' decks");

    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "EX3-057", as: "growlmon" }],
        hand: [{ card: "EX3-062", as: "warGrowlmon" }],
        deck: ["BT1-001"],
      },
    });
    alternate.state.memory = 3;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("growlmon").permanentId,
        instanceId: alternate.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("growlmon").topCard.cardId === "EX3-062");
    expect(alternate.state.memory).toBe(0);

    const printed = setupEngine({
      0: {
        battleArea: [{ card: "EX3-058", as: "purpleLevel4" }],
        hand: [{ card: "EX3-062", as: "warGrowlmon" }],
        deck: ["BT1-001"],
      },
    });
    printed.state.memory = 4;
    await printed.ready();
    expect(
      printed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printed.perm("purpleLevel4").permanentId,
        instanceId: printed.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => printed.perm("purpleLevel4").topCard.cardId === "EX3-062");
    expect(printed.state.memory).toBe(0);
  });

  it("rejects a red level 4 whose name does not contain Growlmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-008", as: "redLevel4" }],
        hand: [{ card: "EX3-062", as: "warGrowlmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLevel4").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("warGrowlmon").instanceId);
  });

  it("mills both decks first, reaches 5 in its own trash, and can play the newly milled Guilmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-057", as: "growlmon" }],
          hand: [
            { card: "EX3-062", as: "warGrowlmon" },
            { card: "EX2-056", as: "takato" },
          ],
          deck: [
            { card: "BT1-001", as: "draw" },
            { card: "EX3-056", as: "milledGuilmon" },
            { card: "BT1-021", as: "cyborgPeer" },
            { card: "BT1-002", as: "thirdMill" },
            { card: "BT1-003", as: "remaining" },
          ],
          trash: ["BT1-004", "BT1-005"],
        },
        1: {
          deck: [
            { card: "BT1-006", as: "opponentFirst" },
            { card: "BT1-007", as: "opponentSecond" },
            { card: "BT1-008", as: "opponentThird" },
            { card: "BT1-009", as: "opponentRemaining" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await acceptOptionalPlay(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.state.pendingDecision?.kind).toBe("selectCards");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(payload(s)).toMatchObject({ min: 1, max: 1, timing: "WhenDigivolving" });
    expect(payload(s).candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("milledGuilmon").instanceId, s.inst("takato").instanceId]),
    );
    expect(payload(s).candidateInstanceIds).not.toContain(s.inst("cyborgPeer").instanceId);
    expect(payload(s).visibleInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("takato").instanceId,
        s.inst("milledGuilmon").instanceId,
        s.inst("cyborgPeer").instanceId,
        s.inst("thirdMill").instanceId,
      ]),
    );
    respond(s, { kind: "selectCards", instanceIds: [s.inst("milledGuilmon").instanceId] });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("milledGuilmon").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentRemaining").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("uses the opponent's post-mill trash threshold and can play Takato from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-057", as: "growlmon" }],
          hand: [
            { card: "EX3-062", as: "warGrowlmon" },
            { card: "EX2-056", as: "takato" },
            { card: "EX3-056", as: "guilmon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          deck: ["BT1-005", "BT1-006", "BT1-007"],
          trash: ["BT1-008", "BT1-009"],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await acceptOptionalPlay(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.state.pendingDecision?.kind).toBe("selectCards");
    respond(s, { kind: "selectCards", instanceIds: [s.inst("takato").instanceId] });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("takato").instanceId),
    );

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmon").instanceId);
    assertNoLoudGap(s);
  });

  it("may decline after milling without moving either eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-057", as: "growlmon" }],
          hand: [
            { card: "EX3-062", as: "warGrowlmon" },
            { card: "EX2-056", as: "takato" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          trash: ["BT1-005", "BT1-006"],
        },
        1: { deck: ["BT1-007", "BT1-008", "BT1-009"] },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    respond(s, { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("takato").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    assertNoLoudGap(s);
  });

  it("mills unconditionally but opens no choice when both trashes stop at 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-057", as: "growlmon" }],
        hand: [
          { card: "EX3-062", as: "warGrowlmon" },
          { card: "EX2-056", as: "takato" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        trash: ["BT1-005"],
      },
      1: {
        deck: ["BT1-006", "BT1-007", "BT1-008"],
        trash: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.length === 4 &&
        s.state.players[1]!.trash.length === 4,
    );

    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("takato").instanceId);
    assertNoLoudGap(s);
  });

  it("opens no impossible optional prompt when the threshold is met without Guilmon or Takato", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-057", as: "growlmon" }],
        hand: [
          { card: "EX3-062", as: "warGrowlmon" },
          { card: "BT9-009", as: "guilmonX" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        trash: ["BT1-005", "BT1-006"],
      },
      1: { deck: ["BT1-007", "BT1-008", "BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 5 && s.state.players[1]!.trash.length === 3);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmonX").instanceId);
    assertNoLoudGap(s);
  });

  it("mills as many as available from short decks and still evaluates the live threshold", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-057", as: "growlmon" }],
          hand: [
            { card: "EX3-062", as: "warGrowlmon" },
            { card: "EX2-056", as: "takato" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          deck: ["BT1-003", "BT1-004"],
          trash: ["BT1-005", "BT1-006", "BT1-007"],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    respond(s, { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    assertNoLoudGap(s);
  });
});
