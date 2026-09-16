import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-017.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"];

function hand(s: ReturnType<typeof setupEngine>): string[] {
  return s.state.players[0]!.hand.map((card) => card.cardId);
}

function deck(s: ReturnType<typeof setupEngine>): string[] {
  return s.state.players[0]!.deck.map((card) => card.cardId);
}

function board(s: ReturnType<typeof setupEngine>): string[] {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "?").sort();
}

describe("BT19-017 Sangomon", () => {
  it("matches the catalog print: Blue Lv.3 Mollusk/LIBERATOR/Aquatic with the On Play reveal", () => {
    expect(getCardDefinition("BT19-017")).toMatchObject({
      cardId: "BT19-017",
      nameEn: "Sangomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mollusk", "LIBERATOR", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Aqua]/[Sea Animal]\u00a0in any of its traits and 1 card with the [LIBERATOR]\u00a0trait among them to the hand. Return the rest to the bottom of the deck.  [Rule] Trait: Has the [Aquatic] type.",
      inheritedEffectText: "[End of Attack] [Once Per Turn] Gain 1 memory.",
    });
  });

  it("compiles the printed clauses into the expected IR", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: { nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }] },
            },
            {
              count: 1,
              to: "hand",
              filter: { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"], target: { filter: { isSelfRef: true } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("optional");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("adds one Aqua-trait card and one LIBERATOR card when played from hand, bottoming the near-miss", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-017", as: "sango" }, "BT1-013"],
          deck: ["BT19-018", "BT19-053", "BT1-030", "BT1-009", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sango").instanceId })).toEqual({ ok: true });
    await settle(() => hand(s).length === 3);

    expect(hand(s).sort()).toEqual(["BT1-013", "BT19-018", "BT19-053"]);
    expect(deck(s)).toEqual(["BT1-009", "BT1-014", "BT1-030"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-017"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still adds every card it can when only one category is present (Q3072)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-017", as: "sango" }, "BT1-013"],
          deck: ["BT1-030", "BT19-053", "BT1-009", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sango").instanceId })).toEqual({ ok: true });
    await settle(() => hand(s).length === 2);

    expect(hand(s).sort()).toEqual(["BT1-013", "BT19-053"]);
    expect(deck(s)).toEqual(["BT1-014", "BT1-030", "BT1-009"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds nothing and bottoms all 3 when no revealed card qualifies", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-017", as: "sango" }, "BT1-013"],
          deck: ["BT1-030", "BT1-009", "BT1-014", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sango").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(hand(s)).toEqual(["BT1-013"]);
    expect(deck(s)).toEqual(["BT1-012", "BT1-030", "BT1-009", "BT1-014"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not add one dual-qualifying revealed card twice", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-017", as: "sango" }, "BT1-013"],
          deck: [{ card: "BT19-019", as: "shellmon" }, "BT1-030", "BT1-009", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const shellmonId = s.inst("shellmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sango").instanceId })).toEqual({ ok: true });
    await settle(() => hand(s).length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(shellmonId);
    expect(hand(s).sort()).toEqual(["BT1-013", "BT19-019"]);
    expect(deck(s)).toEqual(["BT1-014", "BT1-030", "BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is treated as having the [Aquatic] type while the Sea Beast peer is not (Q3073)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-017", as: "sango" },
          { card: "BT1-030", as: "gomamon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("sango"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("sango"), "LIBERATOR")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("gomamon"), "Aquatic")).toBe(false);
  });

  it("is selected by another card's [Aqua]-trait filter on the strength of the Rule alone (Q3073)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-023", as: "base" },
            { card: "BT19-017", as: "sango" },
            { card: "BT1-030", as: "gomamon" },
          ],
          hand: [{ card: "BT19-028", as: "xiang" }, "BT1-013"],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sangoId = s.inst("sango").instanceId;
    const baseId = s.inst("base").instanceId;
    const gomamonId = s.perm("gomamon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    const merged = s.perm("base");
    expect(merged.topCard?.cardId).toBe("BT19-028");
    expect(merged.stack.map((card) => card.instanceId)).toEqual([sangoId, baseId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(gomamonId);
    expect(board(s)).toEqual(["BT1-030", "BT19-028"]);
    expect(s.state.memory).toBe(8);
    expect(hand(s).sort()).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal digivolution source and accepts the printed Blue Lv.2 route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: "BT19-017", as: "sango" }, "BT1-013"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: s.inst("sango").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.memory).toBe(3);

    const legal = setupEngine({
      0: {
        breeding: { card: "BT19-002", as: "blueEgg" },
        hand: [{ card: "BT19-017", as: "sango" }, "BT1-013"],
        deck: ["BT1-009", "BT1-014"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    const eggId = legal.inst("blueEgg").instanceId;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blueEgg").permanentId,
        instanceId: legal.inst("sango").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.breeding?.topCard?.cardId === "BT19-017");

    expect(legal.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(legal.state.memory).toBe(3);
    expect(legal.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-013"]);
  });

  it("gains 1 memory at End of Attack from under a real Shellmon host, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-019", as: "host", dp: 20_000, under: ["BT19-017"] }],
        deck: [...FILLER],
        security: ["BT1-009", "BT1-013"],
        hand: ["BT1-013"],
      },
      1: {
        deck: [...FILLER],
        security: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === before + 1);
    expect(s.state.memory).toBe(before + 1);
    expect(s.state.players[1]!.security).toHaveLength(4);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.state.memory).toBe(before + 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.perm("host").isSuspended).toBe(false);

    const beforeSecondTurn = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === beforeSecondTurn + 1);
    expect(s.state.memory).toBe(beforeSecondTurn + 1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
