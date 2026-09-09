import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-019.js";

/** Inert filler so neither seat decks out or auto-passes during a real turn loop. */
const FILLER = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"];

function hand(s: ReturnType<typeof setupEngine>): string[] {
  return s.state.players[0]!.hand.map((card) => card.cardId);
}

function board(s: ReturnType<typeof setupEngine>): string[] {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "?").sort();
}

describe("BT19-019 Shellmon", () => {
  it("matches the catalog print: Blue Lv.4 Mollusk/LIBERATOR/Aquatic, digivolve Blue Lv.3 cost 2", () => {
    expect(getCardDefinition("BT19-019")).toMatchObject({
      cardId: "BT19-019",
      nameEn: "Shellmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mollusk", "LIBERATOR", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Yao Qinglan] from your hand without paying the cost.  [Rule] Trait: Has the [Aquatic] type.",
      inheritedEffectText: "[End of Attack] [Once Per Turn] Gain 1 memory.",
    });
  });

  it("compiles the printed clauses into the expected IR", () => {
    // "[Yao Qinglan]" is a bracketed exact reference, so the gate is `nameExact`, not the
    // substring form `name`.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Yao Qinglan"], match: "nameExact" }],
            },
          },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves publicly onto a Blue Lv.3 for 2 and plays Yao Qinglan free from the When Digivolving window", async () => {
    // Realistic stack: BT19-017 Sangomon (Blue Lv.3 LIBERATOR) is the printed source. The
    // digivolve intent pays the printed cost of 2 and draws the 1 digivolution card, and the
    // free play of the Tamer costs nothing on top of it.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-017", as: "base" }],
          hand: [{ card: "BT19-019", as: "shell" }, { card: "BT19-082", as: "yao" }, "BT1-013"],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sangoId = s.inst("base").instanceId;
    const yaoId = s.inst("yao").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shell").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-019");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sangoId]);
    expect(board(s)).toEqual(["BT19-019", "BT19-082"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === yaoId)).toBe(true);
    // Cost 2 for the digivolve, 0 for the Tamer.
    expect(s.state.memory).toBe(8);
    // 1 bonus draw; the Tamer left the hand, the spare BT1-013 did not.
    expect(hand(s).sort()).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is still eligible with exactly 1 Tamer and blocked at 2", async () => {
    for (const [tamers, expectedBoard] of [
      [["BT19-081"], ["BT19-019", "BT19-081", "BT19-082"]],
      [
        ["BT19-081", "BT19-079"],
        ["BT19-019", "BT19-079", "BT19-081"],
      ],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-017", as: "base" }, ...tamers],
            hand: [{ card: "BT19-019", as: "shell" }, { card: "BT19-082", as: "yao" }, "BT1-013"],
            deck: ["BT1-009", "BT1-014"],
          },
          1: { security: ["BT1-009", "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shell").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT19-019");
      // Drain fully: the 2-Tamer branch asserts that no extra permanent appears, which a
      // predicate cannot wait for.
      await settle();

      expect(board(s)).toEqual([...expectedBoard]);
      // With 2 Tamers the condition fails, so Yao Qinglan stays in hand next to the spare.
      expect(hand(s).includes("BT19-082")).toBe(tamers.length === 2);
      expect(s.state.memory).toBe(8);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("may decline the free play and keep Yao Qinglan in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-017", as: "base" }],
          hand: [{ card: "BT19-019", as: "shell" }, { card: "BT19-082", as: "yao" }, "BT1-013"],
          deck: ["BT1-009", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shell").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-019");
    await settle();

    expect(board(s)).toEqual(["BT19-019"]);
    expect(hand(s).sort()).toEqual(["BT1-009", "BT1-013", "BT19-082"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("matches [Yao Qinglan] by exact name, not by card id, and ignores the LIBERATOR Tamer peer", async () => {
    // Near-miss peer: BT18-093 Violet Inboots is also a Tamer with the [LIBERATOR] trait, but is
    // not named Yao Qinglan. BT22-086 is a DIFFERENT card id printing the same name, so the
    // `nameExact` gate must take it.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-017", as: "base" }],
          hand: [
            { card: "BT19-019", as: "shell" },
            { card: "BT18-093", as: "violet" },
            { card: "BT22-086", as: "otherYao" },
          ],
          deck: ["BT1-009", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const otherYaoId = s.inst("otherYao").instanceId;
    const violetId = s.inst("violet").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shell").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === otherYaoId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(violetId);
    expect(hand(s).sort()).toEqual(["BT1-009", "BT18-093"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal digivolution source", async () => {
    // Printed requirement: Blue Lv.3. BT1-009 Monodramon is a RED Lv.3 and BT1-014 Kokatorimon a
    // red Lv.4, so neither is a legal source at any memory.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "redLv3" },
          { card: "BT1-014", as: "redLv4" },
        ],
        hand: [{ card: "BT19-019", as: "shell" }, "BT1-013"],
        deck: ["BT1-009", "BT1-014"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["redLv3", "redLv4"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("shell").instanceId,
        }),
      ).not.toEqual({ ok: true });
    }

    expect(board(s)).toEqual(["BT1-009", "BT1-014"]);
    expect(hand(s).sort()).toEqual(["BT1-013", "BT19-019"]);
    expect(s.state.memory).toBe(10);
  });

  it("counts as having the [Aquatic] type for another card's trait filter (Q3075)", async () => {
    // The printed "[Rule] Trait: Has the [Aquatic] type." has a cross-card consequence: BT19-017
    // Sangomon's On Play looks for "[Aqua]/[Sea Animal] in any of its traits", and Shellmon
    // qualifies on [Aquatic] alone. BT1-030 Gomamon ([Sea Beast]) is the near-miss that must not.
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
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-030", "BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();

    const onBoard = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-019", as: "shell" },
          { card: "BT1-030", as: "gomamon" },
        ],
      },
    });
    await onBoard.ready();
    expect(observe(onBoard.engine).hasEffectiveTrait(onBoard.perm("shell"), "Aquatic")).toBe(true);
    expect(observe(onBoard.engine).hasEffectiveTrait(onBoard.perm("gomamon"), "Aquatic")).toBe(false);
  });

  it("gains 1 memory at End of Attack from under a real Huankunmon host, once per turn", async () => {
    // Peer/stack case: the realistic Swimmon (Lv.3) -> Shellmon (Lv.4) -> Huankunmon (Lv.5)
    // stack. Only BT19-019's buried clause pays memory — BT19-018's inherited ＜Jamming＞ and
    // BT19-023's own [Your Turn] inherited clause contribute none.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-023", as: "host", dp: 20_000, under: ["BT19-018", "BT19-019"] }],
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

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT19-018", "BT19-019"]);

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

    // Same turn, second attack by the same host: [Once Per Turn] is spent.
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

    // Next own turn: the counter resets.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);

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
