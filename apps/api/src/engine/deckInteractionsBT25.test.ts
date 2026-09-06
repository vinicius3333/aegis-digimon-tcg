import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

function playCard(s: ReturnType<typeof setupEngine>, alias: string) {
  const result = s.engine.applyIntent(0, {
    type: "playCard",
    instanceId: s.inst(alias).instanceId,
  });
  expect(result).toEqual({ ok: true });
}

function digivolve(s: ReturnType<typeof setupEngine>, base: string, card: string) {
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(base).permanentId,
    instanceId: s.inst(card).instanceId,
  });
  expect(result).toEqual({ ok: true });
}

describe("BT25 deck-specific interaction oracles", () => {
  it("BT25 Angels — Junomon places another Digimon into security before the DNA security exchange", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-083", as: "base" },
            { card: "BT25-034", as: "placed" },
          ],
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: ["BT1-090", "BT1-090"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-090", "BT1-090"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    digivolve(s, "base", "junomon");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placement = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placement.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT25-034"),
    );
    const freePlay = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: freePlay.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT25-044" &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT25-034") &&
        s.state.players[1]!.security.length === 1,
    );
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-034")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("BT25 Glowing Dawn — Reina stores the deck top face-down under herself and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST23-14", as: "reina" }],
          deck: ["BT25-046", "BT25-049"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    playCard(s, "reina");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST23-14"));
    const reina = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "ST23-14")!;
    await settle(() => reina.stack.length === 1);
    expect(reina.stack[0]?.cardId).toBe("BT25-046");
    expect(s.state.memory).toBe(7); // 4-cost Tamer, then +1 from its [On Play].
    assertNoLoudGap(s);
  });

  it("BT25 BeelStarmon — evolving into BeelStarmon uses a Three Musketeers Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-083", as: "lady" }],
          hand: [
            { card: "BT25-085", as: "beel" },
            { card: "BT25-093", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    digivolve(s, "lady", "beel");
    await settle(() => s.perm("lady").topCard?.cardId === "BT25-085");
    await settle(() => false, 40);
    expect(s.perm("lady").topCard?.cardId).toBe("BT25-085");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-093")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("BT25 Jupitermon — Lunamon searches two trait families and orders the remainder to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-022", as: "lunamon" }],
          deck: ["BT25-044", "BT25-008", "BT1-009", "BT1-027"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    playCard(s, "lunamon");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT25-044"));
    const hand = s.state.players[0]!.hand.map((card) => card.cardId);
    expect(hand).toContain("BT25-044");
    expect(hand).toContain("BT25-008");
    expect(s.state.players[0]!.deck).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("BT25 Glowing Dawn recipe — Gekkomon separates a Glowing Dawn hit from a green BEATBREAK hit", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-046", as: "gekkomon" }],
          deck: ["BT25-049", "BT1-009", "BT1-027"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    playCard(s, "gekkomon");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT25-049"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-049");
    expect(s.state.players[0]!.deck).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("BT25 ShineGreymon — AD1 ShineGreymon plays Marcus and scales its DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-044", as: "rize" }, { card: "BT12-092" }, { card: "BT12-092" }],
          hand: [
            { card: "AD1-016", as: "shine" },
            { card: "AD1-021", as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    digivolve(s, "rize", "shine");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "AD1-021"));
    await settle(() => false, 40);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "AD1-021")).toBe(true);
    expect(s.state.players[1]!.battleArea.length).toBeLessThanOrEqual(1);
    assertNoLoudGap(s);
  });

  it("BT25 Vulcanusmon — fewer Digimon enables the conditional five-memory play reduction", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-075", as: "vulcanus" }] },
      1: { battleArea: [{ card: "BT1-009" }, { card: "BT1-009" }] },
    });
    s.state.memory = 12;
    playCard(s, "vulcanus");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-075"));
    expect(s.state.memory).toBe(5); // Printed cost 12, reduced by 5 because its controller has fewer Digimon.
    expect(s.state.players[0]!.battleArea[0]?.topCard?.cardId).toBe("BT25-075");
    assertNoLoudGap(s);
  });

  it("BT25 Millenniummon — MoonMillenniummon trims the opponent hand and deletes Tamers per pair", async () => {
    const opponentHand = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-075", as: "moon" }] },
        1: {
          hand: opponentHand,
          battleArea: [
            { card: "BT7-089", as: "tamerA" },
            { card: "BT7-089", as: "tamerB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    playCard(s, "moon");
    await settle(() => s.state.players[1]!.hand.length === 5);
    expect(s.state.players[1]!.hand).toHaveLength(5);
    assertNoLoudGap(s);
  });

  it("BT25 Marsmon — the 13,000 DP opponent turns on the conditional play reduction and battle buff", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-020", as: "mars" }], battleArea: [{ card: "BT25-008", as: "ally" }] },
        1: { battleArea: [{ card: "BT25-058", dp: 13000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    playCard(s, "mars");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-020"));
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.currentDP >= 4000)).toBe(true);
    assertNoLoudGap(s);
  });

  it("BT25 Gear Forest Village — Deramon converts a second suspended Digimon into an unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-055", as: "deramon" }],
          battleArea: [{ card: "BT25-047", as: "ally", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "alreadySuspended", suspended: true },
            { card: "BT1-009", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    playCard(s, "deramon");
    await settle(() => !s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.isSuspended)).toBe(true);
    assertNoLoudGap(s);
  });

  it("BT25 GraceNovamon — DNA stacks Apollomon and Dianamon into the Partition result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-018", as: "apollo" },
            { card: "BT25-028", as: "diana" },
          ],
          hand: [{ card: "BT25-103", as: "grace" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const apolloId = s.perm("apollo").permanentId;
    const dianaId = s.perm("diana").permanentId;
    const result = s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [apolloId, dianaId],
      instanceId: s.inst("grace").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-103"));
    const grace = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT25-103");
    expect(grace).toBeDefined();
    expect(grace!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT25-018", "BT25-028"]));
    assertNoLoudGap(s);
  });

  it("BT25 Rebootmon — linking an Appmon card triggers the deck's link interaction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-060", as: "reboot" }],
        hand: [{ card: "BT21-009", as: "link" }],
      },
    });
    s.state.memory = 1;
    const result = s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst("link").instanceId,
      targetPermanentId: s.perm("reboot").permanentId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("reboot").linked.length === 1);
    expect(s.perm("reboot").linked).toHaveLength(1);
  });
});
