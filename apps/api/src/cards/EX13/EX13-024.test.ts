import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-024.js";
import "../index.js";

const cardId = "EX13-024";

const NAME_MATCH = "ST8-03";
const TEXT_MATCH = "BT20-023";
const NEAR_MISS = "BT1-009";
const NON_MATCH = "BT1-013";

describe("EX13-024 Slayerdramon", () => {
  it("matches the catalog and the committed IR clause for clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Slayerdramon",
      colors: ["Blue", "Red"],
      kinds: ["Digimon"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
    });

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Raid", raw: "＜Raid＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.frequency).toBeUndefined();
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashDigivolution",
            amount: 1,
            scope: "acrossDigimon",
            scaling: { per: 1, unit: "digivolutionCards" },
            target: {
              count: "all",
              filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
            },
          },
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            target: {
              count: "all",
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDigivolutionCards" },
            },
          },
        ],
      });
    }

    const preventions = compiled.effects.filter((effect) =>
      effect.actions.some((action) => action.kind === "Replacement"),
    );
    expect(preventions).toHaveLength(2);
    expect(preventions.map(({ isInherited }) => isInherited ?? false)).toEqual([false, true]);
    for (const effect of preventions) {
      expect(effect).toMatchObject({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            mode: "prevent",
            optional: true,
            affectsAll: true,
            target: {
              count: "all",
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                printedTextOnly: true,
              },
            },
            cost: {
              kind: "suspend",
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                  printedTextOnly: true,
                },
              },
            },
          },
        ],
      });
      expect(effect.sharedUseKey).toBeUndefined();
      expect(effect.actions[0]).not.toHaveProperty("leaveCause");
    }

    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { namesExact: ["Wingdramon", "Groundramon"], cost: 3, isAlternate: true },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        reduceCost: 5,
        materials: [5, 4, 3].map((level) => ({
          count: 1,
          level,
          nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
        })),
      },
    ]);
  });

  it("takes both named alternate routes for 3, the printed EvoCost for 4, and rejects an illegal source", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT20-025", true, 3],
      ["EX3-041", true, 3],
      ["BT20-025", false, 4],
    ] as const) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "slayer" }] },
          1: { battleArea: [{ card: NON_MATCH, as: "bystander" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = memory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("slayer").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);

      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([baseCardId]);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    }

    const fallback = setupEngine(
      { 0: { battleArea: [{ card: "BT1-038", as: "base" }], hand: [{ card: cardId, as: "slayer" }] } },
      { autoDeclineOptional: true },
    );
    fallback.state.memory = 4;
    await fallback.ready();
    expect(
      fallback.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fallback.perm("base").permanentId,
        instanceId: fallback.inst("slayer").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => fallback.perm("base").topCard.cardId === cardId);
    expect(fallback.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT3-053", as: "base" }], hand: [{ card: cardId, as: "slayer" }] },
    });
    illegal.state.memory = 4;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("slayer").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.memory).toBe(4);
  });

  it.each([
    [1, 1],
    [3, 3],
  ])(
    "trashes exactly one opponent digivolution card per own stack card (%i under -> %i trashed)",
    async (stackSize, expectedTrashed) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: cardId,
                as: "slayer",
                under: ["BT1-010", "BT1-011", "BT1-012"].slice(0, stackSize),
              },
            ],
          },
          1: {
            battleArea: [
              { card: "BT1-014", as: "deep", under: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
              { card: NON_MATCH, as: "shallow", under: ["BT1-010"] },
            ],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const stackCardsBefore = s.perm("deep").stack.length + s.perm("shallow").stack.length;

      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("slayer"));
      await settle(() => s.state.players[1]!.trash.length === expectedTrashed);

      expect(s.state.players[1]!.trash).toHaveLength(expectedTrashed);
      const stackCardsAfter =
        (s.state.players[1]!.battleArea.find((p) => p.permanentId === s.perm("deep").permanentId)?.stack.length ?? 0) +
        (s.state.players[1]!.battleArea.find((p) => p.permanentId === s.perm("shallow").permanentId)?.stack.length ??
          0);
      expect(stackCardsAfter).toBe(stackCardsBefore - expectedTrashed);
      expect(s.state.players[1]!.battleArea).toHaveLength(2);
      expect(s.state.players[1]!.deck).toHaveLength(0);
    },
  );

  it("returns every tied fewest-stack opponent Digimon to the deck bottom and leaves deeper stacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "slayer", under: ["BT1-010"] }] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "deep", under: ["BT1-010", "BT1-011", "BT1-012"] },
            { card: NON_MATCH, as: "firstBare" },
            { card: NEAR_MISS, as: "secondBare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const bareIds = [s.perm("firstBare").permanentId, s.perm("secondBare").permanentId];
    const deepId = s.perm("deep").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("slayer"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(deepId);

    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => bareIds.includes(permanentId))).toBe(false);
    expect(s.state.players[1]!.deck.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining([NON_MATCH, NEAR_MISS]),
    );
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("declines the optional return while the mandatory trash still resolves", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "slayer", under: ["BT1-010", "BT1-011"] }] },
        1: { battleArea: [{ card: "BT1-014", as: "deep", under: ["BT1-010", "BT1-011"] }, { card: NON_MATCH }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("slayer"));
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.perm("deep").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("runs the removal pair on a public When Digivolving with the route's stack as the multiplier", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-025", as: "base" }], hand: [{ card: cardId, as: "slayer" }] },
        1: { battleArea: [{ card: "BT1-014", as: "deep", under: ["BT1-010", "BT1-011"] }, { card: NON_MATCH }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("slayer").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual(["BT20-025"]);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.deck.map(({ cardId: id }) => id)).toEqual([NON_MATCH]);
    expect(s.state.memory).toBe(0);
  });

  it("prevents every matching Digimon from leaving at once, paid by suspending one matching ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer" },
            { card: NAME_MATCH, as: "nameMatch" },
            { card: TEXT_MATCH, as: "textMatch" },
            { card: NEAR_MISS, as: "nearMiss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    const matchingIds = [s.perm("nameMatch").permanentId, s.perm("textMatch").permanentId];

    expect(await advance(s.engine).verb.deletePermanent(matchingIds, "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.isSuspended));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining(matchingIds),
    );
    expect(s.state.players[0]!.battleArea.filter((p) => p.isSuspended)).toHaveLength(1);
    const payer = s.state.players[0]!.battleArea.find((p) => p.isSuspended)!;
    expect([s.perm("slayer").permanentId, ...matchingIds]).toContain(payer.permanentId);
    expect(payer.permanentId).not.toBe(s.perm("nearMiss").permanentId);
  });

  it("refuses to protect the near-miss Monodramon or a plain non-matching Digimon", async () => {
    for (const unprotected of [NEAR_MISS, NON_MATCH]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "slayer" },
              { card: unprotected, as: "victim" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      expect(await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect")).toBe(1);
      await settle();

      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
      expect(s.perm("slayer").isSuspended).toBe(false);
    }
  });

  it("protects the printed host itself, because its own text carries [Dracomon] and [Examon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer" },
            { card: NAME_MATCH, as: "payer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    const preferred = [s.perm("payer").topCard.instanceId];

    expect(await advance(s.engine).verb.deletePermanent([s.perm("slayer").permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.isSuspended));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining([cardId, NAME_MATCH]),
    );
    expect(preferred).toHaveLength(1);
  });

  it("cannot pay when every matching Digimon is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer", suspended: true },
            { card: NAME_MATCH, as: "nameMatch", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("nameMatch").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
  });

  it("prevents a battle deletion as well, which BT20-027's 'other than in battle' wording would not", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer" },
            { card: NAME_MATCH, as: "victim", suspended: true },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 10_000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining([cardId, NAME_MATCH]),
    );
    expect(s.perm("slayer").isSuspended).toBe(true);
  });

  it("is once per turn and resets on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer" },
            { card: NAME_MATCH, as: "first" },
            { card: TEXT_MATCH, as: "second" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([firstId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.isSuspended));
    const payerId = s.state.players[0]!.battleArea.find((p) => p.isSuspended)!.permanentId;

    await advance(s.engine).verb.unsuspend([payerId]);
    expect(await advance(s.engine).verb.deletePermanent([secondId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === secondId)).toBe(false);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(await advance(s.engine).verb.deletePermanent([firstId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.isSuspended));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === firstId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("installs the same prevention from an inheriting host's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [cardId] },
            { card: NAME_MATCH, as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("victim").isSuspended);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  it("survives a public opponent bounce by paying the prevention cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer" },
            { card: NAME_MATCH, as: "victim" },
          ],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "blueSource" }],
          hand: [{ card: "ST2-16", as: "bounce" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("bounce").instanceId));

    expect(s.state.players[0]!.hand.some(({ cardId: id }) => id === NAME_MATCH)).toBe(false);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining([cardId, NAME_MATCH]),
    );
    expect(s.state.players[0]!.battleArea.filter((p) => p.isSuspended)).toHaveLength(1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("prevents Examon from leaving and still resolves its simultaneous Partition (Q7274)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "slayer" },
            {
              card: "BT23-047",
              as: "examon",
              under: [
                { card: "BT1-076", as: "greenLv5" },
                { card: "BT1-038", as: "blueLv5" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const examonId = s.perm("examon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([examonId], "byEffect")).toBe(0);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === examonId)).toBe(true);
    expect(s.perm("examon").stack).toHaveLength(0);
    expect(s.perm("slayer").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greenLv5").instanceId, s.inst("blueLv5").instanceId]),
    );
  });

  it("redirects its attack onto the unsuspended highest-DP Digimon with Raid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "slayer" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 10_000, as: "raidTarget" },
            { card: NEAR_MISS, dp: 1000, suspended: true, as: "ignored" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const raidTargetId = s.perm("raidTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("slayer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === raidTargetId));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEAR_MISS]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("blocks an opponent's attack on the player and wins the battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "slayer" }], security: ["BT1-010"] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    const window = s.events.findLast(({ kind }) => kind === "blockWindowOpened");
    if (window?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(window.eligibleBlockerIds).toContain(s.perm("slayer").permanentId);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("slayer").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("assembles for 7 from one trash material per printed level and enforces each slot", async () => {
    const valid = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "slayer" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [
            { card: "BT20-025", as: "m0" },
            { card: TEXT_MATCH, as: "m1" },
            { card: NAME_MATCH, as: "m2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 7;
    await valid.ready();

    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("slayer").instanceId,
        assembly: {
          materialInstanceIds: [valid.inst("m0").instanceId, valid.inst("m1").instanceId, valid.inst("m2").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));

    expect(valid.state.memory).toBe(0);
    const assembled = valid.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(assembled.stack.map(({ cardId: id }) => id)).toEqual([NAME_MATCH, TEXT_MATCH, "BT20-025"]);

    for (const materials of [
      [TEXT_MATCH, TEXT_MATCH, NAME_MATCH],
      ["BT1-038", TEXT_MATCH, NAME_MATCH],
      ["BT20-025", TEXT_MATCH, NEAR_MISS],
    ]) {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "slayer" }],
          trash: materials.map((card, index) => ({ card, as: `m${index}` })),
        },
      });
      s.state.memory = 7;
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("slayer").instanceId,
          assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`m${index}`).instanceId) },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.memory).toBe(7);
    }
  });
});
