import { describe, it, expect } from "vitest";
import { EffectTiming, PendingDecision, type Permanent as PermanentType } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  findPermanent,
  settle,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 8 "Digivolution" (comprehensive-0123..0135).
 *
 * comprehensive-0123 (bare chapter heading) is already seeded in `not-testable.ts` by an
 * earlier lane; not repeated here. See README.md for the citation contract.
 */

// Real fixtures from the generated card table, reused throughout this file:
//   BT1-009  Monodramon — Digimon, Red Lv.3, playCost 2, DP 3000 (a legal digivolve base)
//   AD1-001  Greymon    — Digimon, Red Lv.4, playCost 5, DP 5000, EvoCost {Red, Lv.3, cost 2}
//   AD1-010  Garurumon  — Digimon, Blue Lv.4, DP 5000 (a DNA-digivolve material)
//   BT1-069  Ogremon    — Digimon, Green Lv.4, DP 4000 (a DNA-digivolve material)
//   ST9-05   Paildramon — Digimon, Blue+Green Lv.5, DP 8000, evoCosts [{Blue,4,4},{Green,4,4}],
//            dnaDigivolveRequirement [{cost:0, materials:[{Blue,4},{Green,4}]}]
//   BT21-023 Globemon   — Digimon, Red+Yellow Lv.5 (an App Fusion material, [Globemon])
//   BT21-073 Charismon  — Digimon, Purple+Black Lv.5 (an App Fusion material, [Charismon])
//   AD1-005  Gaiamon    — Digimon, Red+White Lv.6, appFusionRequirement [{names:[Globemon,Charismon],cost:0}]

function primitivesOf(s: ReturnType<typeof setup>): {
  dnaDigivolveInto(
    materialPermanentIds: string[],
    resultInstanceId: string,
    opts?: { payCost?: boolean },
  ): Promise<PermanentType | undefined>;
  appFuseInto(sourcePermanentId: string, resultInstanceId: string): Promise<PermanentType | undefined>;
} {
  return (
    s.engine as unknown as {
      primitives: {
        dnaDigivolveInto(
          materialPermanentIds: string[],
          resultInstanceId: string,
          opts?: { payCost?: boolean },
        ): Promise<PermanentType | undefined>;
        appFuseInto(sourcePermanentId: string, resultInstanceId: string): Promise<PermanentType | undefined>;
      };
    }
  ).primitives;
}

describe("§8-1 Digivolution (comprehensive-0124)", () => {
  it("8-1-1: a hand Digimon stacks onto an existing field permanent, paying its evolve cost, as a Main-phase action", async () => {
    cite(
      "comprehensive-0124",
      "8-1-1 digivolution transforms a card on the field by stacking a Digimon card on " +
        "top of it, paying its cost, as a Main phase action",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 3000, "BT1-009");
    p0.battleArea.push(base);
    const evolver = instance("AD1-001", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evolver.instanceId,
    });
    expect(result).toEqual({ ok: true });

    await settle(() => base.topCard?.cardId === "AD1-001");
    expect(memoryBefore - s.state.memory).toBe(2); // AD1-001's EvoCost {Red, Lv.3, cost 2}
    expect(base.currentDP).toBe(5000);
  });
});

describe("§8-1-2 Digivolution Rules (comprehensive-0125)", () => {
  it("8-1-2-3/8-1-2-4: the digivolved Digimon is ONE Digimon (prior top becomes a digivolution card), carrying over suspended orientation", async () => {
    cite(
      "comprehensive-0125",
      "8-1-2-3 a digivolved Digimon is a single Digimon with its digivolution cards " +
        "included; 8-1-2-4 it carries over its orientation (suspended state) from before",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 3000, "BT1-009");
    base.isSuspended = true;
    p0.battleArea.push(base);
    const evolver = instance("AD1-001", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: evolver.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "AD1-001");

    // One Digimon: exactly one permanent on the board, and the prior top is now a digivolution
    // card in ITS stack (not a separate battle-area entry).
    expect(p0.battleArea.filter((p) => p.permanentId === base.permanentId)).toHaveLength(1);
    expect(base.stack.some((c) => c.cardId === "BT1-009")).toBe(true);
    // Orientation carried over.
    expect(base.isSuspended).toBe(true);
  });

  it("8-1-2-6: only 1 digivolution can be performed at a time — a second digivolve is rejected while one is mid-resolution", () => {
    cite(
      "comprehensive-0125",
      "8-1-2-6 1 digivolution can only be performed on 1 Digimon; you can't perform " +
        "separate digivolutions on multiple cards at the same time",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base1 = digimon(0, 3000, "BT1-009");
    const base2 = digimon(0, 3000, "BT1-009");
    p0.battleArea.push(base1, base2);
    const evolver2 = instance("AD1-001", 0, false);
    p0.hand.push(evolver2);
    s.state.memory = 10;

    // Simulate the mid-resolution window an open digivolve holds (the real engine sets this
    // exact gate — validateDigivolve's decision-pending check — while WhenDigivolving resolution
    // awaits a player decision on the FIRST digivolve).
    const pd = new PendingDecision();
    pd.decisionId = "d1";
    pd.seat = 0;
    pd.kind = "optional";
    s.state.pendingDecision = pd;

    const secondAttempt = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base2.permanentId,
      instanceId: evolver2.instanceId,
    });
    expect(secondAttempt).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("8-1-2-7: an unaffordable digivolve returns the revealed card unchanged and doesn't move memory", () => {
    cite(
      "comprehensive-0125",
      "8-1-2-7 if a card can no longer be digivolved after reveal, it's returned " +
        "unchanged; memory doesn't move when it fails on cost",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 3000, "BT1-009");
    p0.battleArea.push(base);
    const evolver = instance("AD1-001", 0, false); // EvoCost 2
    p0.hand.push(evolver);
    s.state.memory = -10; // maxAffordable(0) = 0 < 2
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evolver.instanceId,
    });
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(p0.hand.some((c) => c.instanceId === evolver.instanceId)).toBe(true);
    expect(base.topCard?.cardId).toBe("BT1-009");
  });
});

describe("§8-1-2-8 Digivolution Rules (comprehensive-0126)", () => {
  it("8-1-2-8: the base permanent's own permanentId is preserved — digivolving is not removal from the field", async () => {
    cite(
      "comprehensive-0126",
      "8-1-2-8 a card that becomes a digivolution card isn't removed from the field; " +
        "it becomes part of the digivolved Digimon's information",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const base = digimon(0, 3000, "BT1-009");
    const permanentIdBefore = base.permanentId;
    p0.battleArea.push(base);
    const evolver = instance("AD1-001", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: evolver.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "AD1-001");

    const found = findPermanent(s, 0, "AD1-001");
    expect(found.permanentId).toBe(permanentIdBefore); // SAME permanent, not a new one
  });

  it("8-1-2-10: digivolution still succeeds with an empty deck (no draw, no crash)", async () => {
    cite(
      "comprehensive-0126",
      "8-1-2-10 digivolution is possible even when a draw isn't possible; the digivolve " +
        "processes without drawing a card",
    );

    const s = setup(); // seatPlayer stages an empty deck (see testkit/harness.ts)
    const p0 = s.state.players[0]!;
    expect(p0.deck.length).toBe(0);
    const base = digimon(0, 3000, "BT1-009");
    p0.battleArea.push(base);
    const evolver = instance("AD1-001", 0, false);
    p0.hand.push(evolver);
    s.state.memory = 10;
    const handSizeBefore = p0.hand.length; // includes the evolver itself, about to leave

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: evolver.instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "AD1-001");
    // The evolver left hand; nothing was drawn to replace it (empty deck) — net hand size -1.
    expect(p0.hand.length).toBe(handSizeBefore - 1);
  });
});

describe("§8-2 DNA Digivolution (comprehensive-0127)", () => {
  it("8-2-1: DNA digivolution consumes 2+ field materials into ONE new Digimon (not a same-permanent stack)", async () => {
    cite(
      "comprehensive-0127",
      "8-2-1 DNA digivolution digivolves 1 [DNA Digivolution] card into 1 NEW Digimon by " +
        "placing multiple material cards on top of it, per its DNA digivolution requirements",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const material1 = digimon(0, 5000, "AD1-010"); // Blue Lv.4
    const material2 = digimon(0, 4000, "BT1-069"); // Green Lv.4
    p0.battleArea.push(material1, material2);
    const result = instance("ST9-05", 0, false); // Blue+Green Lv.5, dnaDigivolveRequirement matches
    p0.hand.push(result);

    const perm = await primitivesOf(s).dnaDigivolveInto(
      [material1.permanentId, material2.permanentId],
      result.instanceId,
    );
    expect(perm).toBeDefined();
    // The two materials no longer exist as their own permanents — they merged into one new one.
    expect(p0.battleArea.some((p) => p.permanentId === material1.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === material2.permanentId)).toBe(false);
    expect(p0.battleArea.filter((p) => p.topCard?.cardId === "ST9-05")).toHaveLength(1);
  });
});

describe("§8-2-2 DNA Digivolution Rules (comprehensive-0128)", () => {
  it("8-2-2-1-1: the DNA-digivolved Digimon ALWAYS enters unsuspended — a suspended material's orientation is NOT carried over", async () => {
    cite(
      "comprehensive-0128",
      "8-2-2-1-1 the card placed on top digivolves unsuspended without carrying over the " +
        "orientation from before the digivolution",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const material1 = digimon(0, 5000, "AD1-010");
    material1.isSuspended = true; // suspended material
    const material2 = digimon(0, 4000, "BT1-069");
    p0.battleArea.push(material1, material2);
    const result = instance("ST9-05", 0, false);
    p0.hand.push(result);
    s.state.turnCount = 3;

    const perm = await primitivesOf(s).dnaDigivolveInto(
      [material1.permanentId, material2.permanentId],
      result.instanceId,
    );
    expect(perm?.isSuspended).toBe(false);
    expect(perm?.enterFieldTurnCount).not.toBe(s.state.turnCount);
  });

  it("8-2-2-1-2: a material's own linked card is trashed immediately when it becomes a digivolution card", async () => {
    cite(
      "comprehensive-0128",
      "8-2-2-1-2 cards that become digivolution cards are new cards; if a card that " +
        "would become a digivolution card has a link card, the link card is trashed first",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const material1 = digimon(0, 5000, "AD1-010");
    const linked = instance("BT1-009", 0, true);
    material1.linked.push(linked);
    const material2 = digimon(0, 4000, "BT1-069");
    p0.battleArea.push(material1, material2);
    const result = instance("ST9-05", 0, false);
    p0.hand.push(result);

    await primitivesOf(s).dnaDigivolveInto([material1.permanentId, material2.permanentId], result.instanceId);
    expect(p0.trash.some((c) => c.instanceId === linked.instanceId)).toBe(true);
  });
});

describe("§8-2-2-1-7 DNA Digivolution Rules (comprehensive-0129)", () => {
  it("8-2-2-4: DNA digivolution can't be performed by the standard digivolve verb (a mismatched single base is illegal)", () => {
    cite(
      "comprehensive-0129",
      "8-2-2-4 DNA digivolution can only be performed by an effect that specifically " +
        "performs DNA digivolution — never by an effect (or verb) that performs standard digivolution",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    // ST9-05's printed evoCosts are {Blue, Lv.4} / {Green, Lv.4} — a base satisfying NEITHER
    // (Red Lv.4, from AD1-001... use a base that matches neither color) proves the standard
    // `digivolve` verb has no path onto ST9-05 that could stand in for its DNA requirement.
    const mismatchedBase = digimon(0, 3000, "BT1-009"); // Red, Lv.3 — matches no evoCost/alt path
    p0.battleArea.push(mismatchedBase);
    const dnaCard = instance("ST9-05", 0, false);
    p0.hand.push(dnaCard);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: mismatchedBase.permanentId,
      instanceId: dnaCard.instanceId,
    });
    // No printed EvoCost matches (wrong color+level) and no alternate requirement applies —
    // the standard verb has NO way to reach ST9-05's DNA-only path.
    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

describe("§8-2-3-1 DNA Digivolution Rules (comprehensive-0130)", () => {
  it("8-2-3-2: the DNA digivolution cost is paid off the shared memory gauge", async () => {
    cite(
      "comprehensive-0130",
      "8-2-3-2 the digivolution cost specified in the chosen DNA digivolution requirement is paid",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const material1 = digimon(0, 5000, "AD1-010");
    const material2 = digimon(0, 4000, "BT1-069");
    p0.battleArea.push(material1, material2);
    const result = instance("ST9-05", 0, false);
    p0.hand.push(result);
    s.state.memory = 10;
    const memoryBefore = s.state.memory;

    const perm = await primitivesOf(s).dnaDigivolveInto(
      [material1.permanentId, material2.permanentId],
      result.instanceId,
      { payCost: true },
    );
    expect(perm).toBeDefined();
    // ST9-05's dnaDigivolveRequirement prints cost 0 (Blue Lv.4 + Green Lv.4: Cost 0).
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("NOW MET: the DNA digivolution procedure should draw the player 1 card", async () => {
    const s = setup();
    const p0 = s.state.players[0]!;
    // A non-empty deck, so a real draw would be observable.
    p0.deck.push(instance("AD1-001", 0, false));
    const material1 = digimon(0, 5000, "AD1-010");
    const material2 = digimon(0, 4000, "BT1-069");
    p0.battleArea.push(material1, material2);
    const result = instance("ST9-05", 0, false);
    p0.hand.push(result);
    const handSizeBefore = p0.hand.length;

    const perm = await primitivesOf(s).dnaDigivolveInto(
      [material1.permanentId, material2.permanentId],
      result.instanceId,
    );
    expect(perm).toBeDefined();

    // DIVERGENCE: `dnaDigivolveInto` (effects/primitives.ts) never calls the draw primitive —
    // unlike the standard `digivolve` action (`applyDigivolve` step 6, `deps.draw(state, seat, 1)`).
    // Rule 8-2-3-3: "The player places the Digimon for the DNA digivolution on top of the
    // stack, draws 1 card, and the DNA digivolution process is resolved." Today: hand size drops
    // by exactly 1 (the played result card leaving hand), with NO offsetting draw.
    expect(p0.hand.length).toBe(handSizeBefore); // -1 (played) +1 (drawn) = net 0
  });
});

describe("§8-3 Burst Digivolve (comprehensive-0131..0133)", () => {
  // BT13-020 (ShineGreymon: Burst Mode) burst-digivolves onto a real "ShineGreymon" base via
  // its compiled alternate (Cost 0) digivolutionRequirement — the SAME vehicle already used by
  // `ch02-card-information.test.ts`'s comprehensive-0040 (§2-3-8) tests, which prove: (a) the
  // Cost-0 alternate path is accepted even though the printed cost (5) is unaffordable, and
  // (b) an EXISTING documented divergence — the Tamer the cost requires returning to hand
  // ([Marcus Damon]) is never actually returned. Cross-referenced here rather than duplicated;
  // this describe block covers the two procedural sub-rules comprehensive-0040 does NOT touch:
  // the burst-digivolve requirement/cost-declaration overview (8-3-1/8-3-3, comprehensive-0131/
  // 0133) and the "trash the top stacked card at end of turn" pending-processing rule
  // (8-3-2-1/2, comprehensive-0132), which no other conformance file exercises.
  function layBurstScenario() {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const base = digimon(0, 9000, "BT4-020"); // a real "ShineGreymon", Red Lv.6
    p0.battleArea.push(base);
    const marcus = digimon(0, 0, "BT12-092"); // a [Marcus Damon] Tamer, the alt-cost's return target
    p0.battleArea.push(marcus);
    const burstCard = instance("BT13-020", 0, false);
    p0.hand.push(burstCard);
    s.state.memory = -10; // the normal printed cost (5) is unaffordable — only Burst (Cost 0) can succeed
    return { s, p0, base, marcus, burstCard };
  }

  it("8-3-1/8-3-3-4: burst digivolve stacks the card and resolves via its OWN (non-printed) requirement", async () => {
    cite(
      "comprehensive-0131",
      "8-3-1 burst digivolve digivolves a [Burst Digivolve] card into 1 of the player's " +
        "Digimon per its burst digivolve requirements, by returning a specified Tamer",
    );
    cite(
      "comprehensive-0133",
      "8-3-3-4 the player places the Digimon for the burst digivolve on top of the chosen " +
        "card, draws 1 card, and the burst digivolve process is resolved",
    );

    const { s, base, burstCard } = layBurstScenario();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: burstCard.instanceId,
      useAlternateCost: true,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "BT13-020");
    expect(base.stack.some((c) => c.cardId === "BT4-020")).toBe(true); // the prior top is now stacked
  });

  it("NOW MET: the top stacked card of a burst-digivolved Digimon should be trashed at the end of the turn", async () => {
    const { s, base, burstCard } = layBurstScenario();
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: burstCard.instanceId,
      useAlternateCost: true,
    });
    await settle(() => base.topCard?.cardId === "BT13-020");
    const stackedTopId = base.stack[base.stack.length - 1]?.instanceId;
    expect(stackedTopId).toBeDefined();

    // Fire the real End-of-Turn window directly (the private seam GameEngine's own turn
    // loop uses) — Comprehensive Rules 8-3-2-1 is pending processing that should trigger here.
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );

    // DIVERGENCE: there is no engine-level tracking of "this permanent was burst-digivolved
    // this turn" anywhere (no field on Permanent, no pending-processing queue consulted at
    // OnEndTurn) — grep for pendingProcessing/burstDigivolve-at-end-of-turn across
    // apps/api/src/engine returns zero hits. Today the stacked card survives end of turn.
    expect(base.stack.some((c) => c.instanceId === stackedTopId)).toBe(false);
  });
});

describe("§8-4 App Fusion (comprehensive-0134)", () => {
  it("8-4-1: App Fusion places a linked card's specified fusion-target on top of a battle-area Digimon", async () => {
    cite(
      "comprehensive-0134",
      "8-4-1 App Fusion digivolves 1 [App Fusion] Digimon card by placing a specified " +
        "link card from 1 specified battle-area Digimon on top of it",
    );

    // App Fusion fires the fusion-target's own WhenDigivolving — AD1-005 carries one that OFFERS
    // an optional Link ("you may link 1 [Social]/[Navi]/[Tool] card from hand or this Digimon's
    // digivolution cards"). BT21-023 (Globemon), the fuser's prior top card, gets pushed onto
    // AD1-005's digivolution stack by App Fusion itself and carries the [Social] attribute — a
    // structurally legal candidate for that unrelated Link prompt. This test isolates ONLY the
    // App Fusion placement rule under test (8-4-1), so it declines that prompt manually (the
    // shared harness's `autoAcceptOptional` only supports accepting, and leaving it unanswered
    // hangs) instead of auto-accepting it and letting AD1-005's own [When Digivolving] ability
    // consume the very card App Fusion just placed.
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const fuser = digimon(0, 10000, "BT21-023"); // topCard Globemon
    const linkedCard = instance("BT21-073", 0, true); // linked Charismon
    fuser.linked.push(linkedCard);
    p0.battleArea.push(fuser);
    const gaiamon = instance("AD1-005", 0, false); // appFusionRequirement: [Globemon]&[Charismon], Cost 0
    p0.hand.push(gaiamon);

    const answeredDecisions = new Set<string>();
    let perm: PermanentType | undefined;
    let settled = false;
    void primitivesOf(s)
      .appFuseInto(fuser.permanentId, gaiamon.instanceId)
      .then((result) => {
        perm = result;
        settled = true;
      });
    // Decline every optional prompt AD1-005's own WhenDigivolving raises (Link, then Delete) as
    // it comes up — this test's fixture never gives the Delete branch a legal target either way.
    await settle(() => {
      const pending = s.state.pendingDecision;
      if (pending !== undefined && pending.kind === "optional" && !answeredDecisions.has(pending.decisionId)) {
        answeredDecisions.add(pending.decisionId);
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: false },
        });
      }
      return settled;
    }, 300);

    expect(perm).toBeDefined();
    expect(perm?.topCard?.cardId).toBe("AD1-005");
    expect(perm?.stack.some((c) => c.cardId === "BT21-023")).toBe(true); // prior top slid under
  });
});

describe("§8-4-2 App Fusion Rules (comprehensive-0135)", () => {
  it("8-4-2-1: the fusion-target's printed app-fusion cost is charged", async () => {
    cite(
      "comprehensive-0135",
      "8-4-2-1 App fusion allows a linked Digimon to digivolve using a combination of 2 " +
        "different specified cards, per the fusion target's printed requirement",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const fuser = digimon(0, 10000, "BT21-023");
    fuser.linked.push(instance("BT21-073", 0, true));
    p0.battleArea.push(fuser);
    const gaiamon = instance("AD1-005", 0, false);
    p0.hand.push(gaiamon);
    s.state.memory = 5;
    const memoryBefore = s.state.memory;

    await primitivesOf(s).appFuseInto(fuser.permanentId, gaiamon.instanceId);
    expect(s.state.memory).toBe(memoryBefore); // AD1-005's requirement prints Cost 0
  });

  it("8-4-3-3: the App Fusion procedure draws the player 1 card", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    p0.deck.push(instance("AD1-001", 0, false)); // non-empty deck: a real draw would be observable
    const fuser = digimon(0, 10000, "BT21-023");
    fuser.linked.push(instance("BT21-073", 0, true));
    p0.battleArea.push(fuser);
    const gaiamon = instance("AD1-005", 0, false);
    p0.hand.push(gaiamon);
    const handSizeBefore = p0.hand.length;

    const perm = await primitivesOf(s).appFuseInto(fuser.permanentId, gaiamon.instanceId);
    expect(perm).toBeDefined();

    // Rule 8-4-3-3: "...places it on top of the Digimon card to app fuse, draws 1 card,
    // and the app fusion process is resolved." The result card leaves hand and the deck card
    // enters hand, so the hand-size invariant proves that the shared App Fusion procedure draws.
    expect(p0.hand.length).toBe(handSizeBefore);
    expect(p0.hand.map((card) => card.cardId)).toEqual(["AD1-001"]);
    expect(p0.deck).toHaveLength(0);
  });
});
