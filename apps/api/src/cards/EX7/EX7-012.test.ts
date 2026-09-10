import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-012.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-012 Lavogaritamon", () => {
  it("compiles the catalog identity, evolution routes, and every printed clause", () => {
    expect(getCardDefinition("EX7-012")).toMatchObject({
      cardId: "EX7-012",
      nameEn: "Lavogaritamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 3 },
        { color: "Black", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Rock Dragon"],
      effectText:
        "[On Play] Delete 1 of your opponent's Digimon with 6000 DP or less.  [When Digivolving] If your opponent doesn't have a Digimon with 6000 DP or less, gain 1 memory.",
      inheritedEffectText: "＜Security Attack +1＞.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", value: 6000 },
              },
              count: 1,
            },
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "opponentHasNone",
              filter: {
                controllerDefault: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", value: 6000 },
              },
              raw: "your opponent doesn't have a Digimon with 6000 DP or less",
            },
          },
        ],
      },
      {
        trigger: "Static",
        isInherited: true,
        actions: [],
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      },
    ]);
  });

  it("plays publicly and deletes exactly one opponent Digimon at the 6000-DP ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-012", as: "lava" }],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 6000, as: "eligible" },
            { card: "BT1-014", dp: 7000, as: "above" },
          ],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lava").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-009"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-012")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("above").permanentId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not delete an opponent Digimon above 6000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-012", as: "lava" }], deck: ["BT1-013"], security: ["BT1-014"] },
        1: {
          battleArea: [{ card: "BT1-014", dp: 6001, as: "above" }],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lava").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-012"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("above").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("legally digivolves from Red Lv4, pays 3, draws, preserves the stack, and gains memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX7-012", as: "lava" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
        security: ["BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-014", dp: 7000, as: "above" }], security: ["BT1-014"] },
    });
    await s.ready();
    const sourceInstanceId = s.perm("base").topCard!.instanceId;
    const drawnInstanceId = s.inst("drawn").instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lava").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-012");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([drawnInstanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not gain memory when an opposing Digimon is exactly 6000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX7-012", as: "lava" }],
        deck: ["BT1-013"],
        security: ["BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "ceiling" }], security: ["BT1-014"] },
    });
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lava").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-012");

    expect(s.state.memory).toBe(2);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("ceiling").permanentId),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("supports the printed Black Lv4 route and rejects a Level-3 source without mutation", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT10-062", as: "blackBase" }],
        hand: [{ card: "EX7-012", as: "lava" }],
        deck: ["BT1-013"],
        security: ["BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-014", dp: 7000 }], security: ["BT1-014"] },
    });
    await legal.ready();
    legal.state.memory = 5;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blackBase").permanentId,
        instanceId: legal.inst("lava").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("blackBase").topCard?.cardId === "EX7-012");
    expect(legal.state.memory).toBe(3);
    assertNoLoudGap(legal);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "tooSmall" }],
        hand: [{ card: "EX7-012", as: "lava" }],
        deck: ["BT1-013"],
        security: ["BT1-014"],
      },
      1: { security: ["BT1-014"] },
    });
    await illegal.ready();
    const handBefore = illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = illegal.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    illegal.state.memory = 5;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("tooSmall").permanentId,
        instanceId: illegal.inst("lava").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(5);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(illegal.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(illegal.perm("tooSmall").topCard?.cardId).toBe("BT1-009");
    expect(illegal.perm("tooSmall").stack).toHaveLength(0);
    assertNoLoudGap(illegal);
  });

  it("uses inherited Security Attack +1 in a public attack and checks two security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", dp: 9000, as: "attacker", under: ["EX7-012"] }] },
      1: { security: ["BT1-014", "BT1-014"] },
    });
    await s.ready();
    expect(s.perm("attacker").securityAttack).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("resolves a legal EX7-012 evolution through the real turn loop", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX7-012", as: "lava" }],
        deck: ["BT1-013"],
        security: ["BT1-014"],
      },
      1: { security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const sourceInstanceId = s.perm("base").topCard!.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lava").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-012");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === drawInstanceId)).toBe(true);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
