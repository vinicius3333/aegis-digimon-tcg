import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-033.js";

// BT19-033 Dorulumon — Yellow/Green Lv.4 Champion, 4000 DP, play cost 4, digivolves from a
// Yellow Lv.3 or a Green Lv.3 for 3.
//   [On Play] This Digimon may digivolve into [JaegerDorulumon] under your Tamers without
//             paying the cost.
//   [On Deletion] ＜Save＞.
//   Inherited: [Your Turn] This Digimon with the [Xros Heart] trait gains ＜Piercing＞.
//
// Knowledge base: `node tools/kb/query.mjs card BT19-033` reports no Q&A entries, matching
// docs/audits/BT19.md#knowledge-base-index (0 rulings). Nothing to cover.
//
// Fixtures:
//   BT1-045 Tsukaimon (Yellow Lv.3) / BT1-064 Goblimon (Green Lv.3) — legal sources.
//   BT1-028 Elecmon (Blue Lv.3) — the illegal source.
//   BT19-083 Rika Nonaka — a Tamer whose only clauses are [On Play] (never fires when seeded)
//     and an Option-triggered [Your Turn]; inert for these boards.
//   BT19-035 ShootingStarmon — the name near-miss under a Tamer. Its printed "also treated as
//     [Starmons] for a DigiXros" alias is DigiXros-only, and it is not a [JaegerDorulumon]
//     under any reading, so the exact-name gate must skip it.
//   BT19-037 Taomon (Yellow Lv.5 Wizard) — the trait near-miss host for the inherited clause.
describe("BT19-033 Dorulumon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-033")).toMatchObject({
      cardId: "BT19-033",
      nameEn: "Dorulumon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Beast", "Xros Heart"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[On Play] This Digimon may digivolve into [JaegerDorulumon] under your Tamers without paying the cost.\n[On Deletion] ＜Save＞.",
      inheritedEffectText: "[Your Turn] This Digimon with the [Xros Heart] trait gains ＜Piercing＞.",
    });
  });

  it("compiles all three printed clauses and nothing else", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          // Printed "[JaegerDorulumon]" is a bracketed EXACT name reference, so the gate is
          // nameExact, not the substring `match: "name"`.
          into: { nameOrTrait: [{ tokens: ["JaegerDorulumon"], match: "nameExact" }] },
          from: ["digivolutionCardsUnderTamers"],
          payCost: false,
          optional: true,
        },
      ],
    });
    // ＜Save＞ must carry the keyword so `withSavePlacementDefaults` applies the CR §4-3-2
    // bottom placement, and must be optional (comprehensive 16-20-3).
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      keywords: [{ keyword: "Save" }],
      actions: [
        {
          kind: "PlaceUnder",
          optional: true,
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
        },
      ],
    });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.coverage).toBe("full");
  });

  // ---------------------------------------------------------------------------
  // Digivolution routes
  // ---------------------------------------------------------------------------

  it.each([
    ["Yellow Lv.3", "BT1-045"],
    ["Green Lv.3", "BT1-064"],
  ])("digivolves from a %s source for 3 with the bonus draw", async (_label, baseCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "BT19-033", as: "doru" }],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("doru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));

    expect(s.perm("base").topCard?.cardId).toBe("BT19-033");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(4000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Blue Lv.3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "blue" }],
        hand: [{ card: "BT19-033", as: "doru" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-013", "BT1-014"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blue").permanentId,
        instanceId: s.inst("doru").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("blue").topCard?.cardId).toBe("BT1-028");
    expect(s.perm("blue").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-033"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // [On Play] free digivolve into [JaegerDorulumon] under YOUR Tamers
  // ---------------------------------------------------------------------------

  it("takes only the JaegerDorulumon from under YOUR Tamer when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-033", as: "doru" }],
          battleArea: [
            {
              card: "BT19-083",
              as: "tamer",
              under: [
                { card: "BT19-035", as: "nameNearMiss" },
                { card: "BT19-038", as: "jaeger" },
              ],
            },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT19-083", as: "opponentTamer", under: [{ card: "BT19-038", as: "opponentJaeger" }] }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const doruInstanceId = s.inst("doru").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: doruInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-038"));
    await settle(() => false, 30);

    const stack = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-038")!;
    expect(stack.topCard!.instanceId).toBe(s.inst("jaeger").instanceId);
    expect(stack.stack.map((card) => card.instanceId)).toEqual([doruInstanceId]);
    expect(stack.currentDP).toBe(7000);
    // Only the exact-name match left the Tamer; the ShootingStarmon near-miss stayed.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("nameNearMiss").instanceId]);
    // The opponent's Tamer is not "your Tamers".
    expect(s.perm("opponentTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("opponentJaeger").instanceId]);
    // Only the play cost of 4 was paid; the digivolve itself was free.
    expect(s.state.memory).toBe(6);
    // Digivolving always draws 1 (CR §6-3-3), even when the cost itself is waived.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when the only JaegerDorulumon sits under the OPPONENT's Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-033", as: "doru" }],
          battleArea: [{ card: "BT19-083", as: "tamer", under: [{ card: "BT19-035", as: "nameNearMiss" }] }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT19-083", as: "opponentTamer", under: [{ card: "BT19-038", as: "opponentJaeger" }] }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("doru").instanceId })).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.perm("doru").topCard?.cardId).toBe("BT19-033");
    expect(s.perm("doru").stack).toHaveLength(0);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("nameNearMiss").instanceId]);
    expect(s.perm("opponentTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("opponentJaeger").instanceId]);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the optional On Play digivolve, leaving the Tamer stack untouched", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-033", as: "doru" }],
          battleArea: [{ card: "BT19-083", as: "tamer", under: [{ card: "BT19-038", as: "jaeger" }] }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("doru").instanceId })).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.perm("doru").topCard?.cardId).toBe("BT19-033");
    expect(s.perm("doru").stack).toHaveLength(0);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("jaeger").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ＜Save＞ (comprehensive 16-20, CR §4-3-2 bottom placement)
  // ---------------------------------------------------------------------------

  it("Save places the deleted Dorulumon at the BOTTOM of your Tamer's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-033", as: "doru" },
            { card: "BT19-083", as: "tamer", under: [{ card: "BT1-045", as: "existing" }] },
          ],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT19-083", as: "opponentTamer" }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const doruInstanceId = s.perm("doru").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("doru").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === doruInstanceId));

    // Bottom-most first: the saved card goes UNDER the Tamer's existing digivolution card.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      doruInstanceId,
      s.inst("existing").instanceId,
    ]);
    // Only YOUR Tamers are legal destinations.
    expect(s.perm("opponentTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-083"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining Save sends the Dorulumon to the trash instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-033", as: "doru" },
            { card: "BT19-083", as: "tamer" },
          ],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const doruInstanceId = s.perm("doru").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("doru").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === doruInstanceId));

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([doruInstanceId]);
  });

  it("Save with no Tamer of your own leaves the card in the trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-033", as: "doru" }], security: ["BT1-013", "BT1-014"] },
        1: { battleArea: [{ card: "BT19-083", as: "opponentTamer" }], security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const doruInstanceId = s.perm("doru").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("doru").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === doruInstanceId));

    expect(s.perm("opponentTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([doruInstanceId]);
  });

  // ---------------------------------------------------------------------------
  // Inherited [Your Turn] ＜Piercing＞ for an [Xros Heart] host
  // ---------------------------------------------------------------------------

  it("grants Piercing only to an Xros Heart host, and only on its controller's turn", async () => {
    // Near-miss peer: the same BT19-033 under BT19-037 Taomon (Yellow Lv.5 Wizard), which
    // carries no [Xros Heart] type, so the `selfHasTrait` gate must refuse it.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-038", as: "host", under: [{ card: "BT19-033", as: "inheritedSource" }] },
            { card: "BT19-037", as: "traitNearMiss", under: ["BT19-033"] },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("inheritedSource").instanceId]);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("traitNearMiss"))).toBe(false);

    // A real turn boundary, not an injected `turnSeat`: on the opponent's turn the
    // [Your Turn] Aura is off for both.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("traitNearMiss"))).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("carries Piercing into a real evolution stack built by a public digivolve, and checks security", async () => {
    // The realistic stack: BT19-033 Dorulumon (Yellow/Green Lv.4, [Xros Heart]) digivolves
    // into BT19-038 JaegerDorulumon (Lv.5 w/[Xros Heart], cost 3) through the ordinary
    // `digivolve` intent. The inherited ＜Piercing＞ then rides under a genuine host, and its
    // rules consequence — excess damage checking security after a won battle (CR §16-2) — is
    // what proves it, not a keyword flag.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-033", as: "doru" }],
          hand: [{ card: "BT19-038", as: "jaeger" }, "BT1-013"],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-050", as: "victim", suspended: true }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    // BT19-038's normal Yellow Lv.4 route costs 4; 5 memory leaves seat 0 the turn to attack in.
    s.state.memory = 5;
    await s.ready();
    const doruInstanceId = s.perm("doru").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("doru").permanentId,
        instanceId: s.inst("jaeger").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));
    await settle(() => false, 30);

    expect(s.perm("doru").topCard?.cardId).toBe("BT19-038");
    expect(s.perm("doru").stack.map((card) => card.instanceId)).toEqual([doruInstanceId]);
    expect(s.perm("doru").currentDP).toBe(7000);
    expect(s.state.memory).toBe(1);

    // The attack itself runs inside the production turn loop, so ＜Piercing＞ is judged by the
    // real combat pipeline rather than by a keyword flag.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasPierce(s.perm("doru"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("doru").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.players[1]!.security.length === 3);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-038"]);
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
