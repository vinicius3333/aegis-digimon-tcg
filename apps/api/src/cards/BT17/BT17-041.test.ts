import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-041.js";
import "./index.js";

describe("BT17-041 ShineGreymon: Burst Mode", () => {
  it("matches the catalog identity, printed text and evolution routes", () => {
    const definition = getCardDefinition("BT17-041");
    expect(definition).toMatchObject({
      cardId: "BT17-041",
      nameEn: "ShineGreymon: Burst Mode",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 8,
      dp: 15000,
      evoCosts: [{ color: "Yellow", level: 6, memoryCost: 5 }],
      isAce: true,
      overflowMemory: 5,
    });
    expect(definition!.effectText).toContain("[Digivolve][ShineGreymon]: Cost 4");
    expect(definition!.effectText).toContain("[Hand] [Counter] ＜Blast Digivolve＞");
    expect(definition!.effectText).toContain(
      "[On Play] [When Digivolving] You may play 1 Tamer card from your hand without paying the cost. Then, for the turn, 1 of your opponent's Digimon gets -5000 DP for each of your Tamers.",
    );
    expect(definition!.effectText).toContain(
      "[When Attacking] By suspending up to 2 of your yellow Tamers, for every Tamer this effect suspended, this Digimon gains ＜Security Attack +1＞for the turn.",
    );
    expect(definition!.inheritedEffectText ?? "").toBe("");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // Printed `[ShineGreymon]` is an exact name: substring `names` would wrongly accept
    // "ShineGreymon: Ruin Mode" / "ShineGreymon: Burst Mode" as cost-4 sources.
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["ShineGreymon"], cost: 4, isAlternate: true }]);
  });

  it("has Blast Digivolve and plays a Tamer before reducing an opponent's DP per Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
      });
      expect(actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: -5000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Tamer"] } },
      });
    }
  });

  it("gains Security Attack +1 per yellow Tamer suspended by the attack cost", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      cost: {
        kind: "suspend",
        target: {
          filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] },
          count: 2,
          upTo: true,
        },
      },
      optional: true,
      scaling: { per: 1, usePaidCount: true },
    });
  });

  it("plays a Tamer from hand and scales the on-play DP reduction by the Tamer count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "existingTamer" }],
          hand: [
            { card: "BT17-041", as: "burst" },
            { card: "BT12-092", as: "playedTamer" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 20000, as: "target" }], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const playedTamerId = s.inst("playedTamer").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    // Two Tamers on board once the played one lands: 20000 - 2 x 5000.
    await settle(() => s.perm("target").currentDP === 10000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedTamerId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces DP by only 5000 when a single Tamer is on the board", async () => {
    // Comparative case for the per-Tamer scaling: same board, one fewer Tamer.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "existingTamer" }],
          hand: [{ card: "BT17-041", as: "burst" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 20000, as: "target" }], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 15000);

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-087")).toHaveLength(
      1,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from an exact [ShineGreymon] for 4 and fires When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-039", as: "base", under: ["BT1-009"] }],
          hand: [{ card: "BT17-041", as: "burst" }, { card: "BT1-087", as: "tamer" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 20000, as: "target" }], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const burstId = s.inst("burst").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: burstId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 15000);

    expect(s.state.memory).toBe(4);
    expect(s.perm("base").topCard.instanceId).toBe(burstId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT17-039"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-087")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a plain yellow Lv6 through the printed catalog route for 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-10", as: "base", under: ["BT1-009"] }],
          hand: [{ card: "BT17-041", as: "burst" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 20000, as: "target" }], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const burstId = s.inst("burst").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: burstId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === burstId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", "ST3-10"]);
  });

  it("refuses a ShineGreymon: Ruin Mode base, whose name only contains [ShineGreymon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-074", as: "ruinMode", under: ["BT1-009"] }],
          hand: [{ card: "BT17-041", as: "burst" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
        1: { hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ruinMode").permanentId,
        instanceId: s.inst("burst").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(8);
    expect(s.perm("ruinMode").topCard.cardId).toBe("EX4-074");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT17-041")).toBe(true);
  });

  it("Blast Digivolves from hand during the opponent's attack without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-035", as: "attacker" }], hand: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT17-039", as: "host", under: ["BT1-009"] }],
          hand: [{ card: "BT17-041", as: "burst" }, { card: "BT1-087", as: "tamer" }, "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window missing");
    const counter = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("burst").instanceId);
    expect(counter).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT17-041");

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT17-039"]);
    // The Blast route still resolves [When Digivolving]: the Tamer lands from hand.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-087")).toBe(true);
  });

  it("gains one Security Attack for each yellow Tamer suspended when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-041", as: "burst" },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT12-092", as: "secondTamer" },
          ],
          hand: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("burst"), "SecurityAttack") === 2);
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("secondTamer").isSuspended).toBe(true);
    // Security Attack +2 means three security cards checked in one attack.
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-009")).toHaveLength(3);
    expect(s.perm("burst").isSuspended).toBe(true);
  });

  // ENGINE GAP: canPayCost's `suspend` branch in
  // apps/api/src/engine/effects/interpreter/costs.ts (~L201-210) ignores
  // `cost.target.upTo`, unlike every neighbouring cost kind: it returns
  // `candidates.length >= required`, so an "up to 2" suspend cost with exactly one
  // legal candidate is judged unpayable and the WhenAttacking effect is never even
  // offered (no decision is raised). Expected: suspend the 1 yellow Tamer and gain
  // ＜Security Attack +1＞ (usePaidCount scaling, proven at the interpreter level by
  // apps/api/src/engine/effects/cardCapabilities.test.ts "scaling usePaidCount
  // (BT17-041)"). Actual: nothing suspended, Security Attack 0, only 1 security checked.
  it("gains only one Security Attack when a single yellow Tamer is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-041", as: "burst" },
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-085", as: "redTamer" },
          ],
          hand: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burst").isSuspended);
    console.log(
      "SEC",
      s.state.players[1]!.security.length,
      observe(s.engine).keywordAmount(s.perm("burst"), "SecurityAttack"),
      s.perm("yellowTamer").isSuspended,
    );
    expect(s.perm("yellowTamer").isSuspended).toBe(true);
    // Comparative peer proof: the red Tamer fails the yellow colour gate and stays unsuspended.
    expect(s.perm("redTamer").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("still attacks with no Security Attack bonus when no yellow Tamer can be suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-041", as: "burst" },
            { card: "BT1-085", as: "redTamer" },
          ],
          hand: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009"], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(observe(s.engine).keywordAmount(s.perm("burst"), "SecurityAttack")).toBe(0);
    expect(s.perm("redTamer").isSuspended).toBe(false);
    expect(s.perm("burst").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
