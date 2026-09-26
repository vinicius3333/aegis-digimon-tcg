import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-016.js";
import "../index.js";

describe("EX13-016 Omnimon", () => {
  it("matches the catalog and encodes every printed timing and requirement", () => {
    expect(getCardDefinition("EX13-016")).toMatchObject({
      cardId: "EX13-016",
      nameEn: "Omnimon",
      colors: ["Red", "White", "Blue"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15_000,
      evoCosts: [
        { color: "Red", level: 6, memoryCost: 5 },
        { color: "Blue", level: 6, memoryCost: 5 },
      ],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 6, traits: ["CS"], cost: 5, isAlternate: true }]);
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { level: 6, names: ["Greymon"] },
          { level: 6, names: ["Garurumon"] },
        ],
      },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        reduceCost: 7,
        materials: [
          { namesExact: ["WarGreymon"], count: 1 },
          { namesExact: ["MetalGarurumon"], count: 1 },
          { namesExact: ["Agumon"], count: 1 },
          { namesExact: ["Gabumon"], count: 1 },
        ],
      },
    ]);
    expect(
      compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords ?? []),
    ).toEqual([{ keyword: "Raid" }, { keyword: "Blocker" }]);
    expect(compiled.effects.filter(({ trigger }) => trigger === "Counter")).toHaveLength(1);
    const lock = compiled.effects.find(({ trigger }) => trigger === "OnPlay")!.actions[0];
    expect(lock).toMatchObject({
      kind: "Restrict",
      target: { count: 2, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      restriction: "suspend",
      blocksCombatSuspend: true,
      duration: "untilOpponentTurnEnd",
    });
  });

  it("takes the public DNA route for a WarGreymon and MetalGarurumon pair at cost 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "warGreymon" },
            { card: "BT1-044", as: "metalGarurumon", under: ["BT1-010"] },
          ],
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: { deck: Array(8).fill("BT1-011"), security: ["BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();
    const warPermanentId = s.perm("warGreymon").permanentId;
    const metalPermanentId = s.perm("metalGarurumon").permanentId;
    const sourceIds = [
      s.perm("warGreymon").topCard.instanceId,
      s.perm("metalGarurumon").topCard.instanceId,
      ...s.perm("metalGarurumon").stack.map(({ instanceId }) => instanceId),
    ];

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [warPermanentId, metalPermanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 1 && s.state.players[0]!.battleArea[0]!.topCard.cardId === "EX13-016",
    );

    const merged = s.state.players[0]!.battleArea[0]!;
    expect(merged.topCard.cardId).toBe("EX13-016");
    expect(merged.stack.map(({ cardId }) => cardId).sort()).toEqual(["BT1-010", "BT1-025", "BT1-044"].sort());
    expect(merged.stack.map(({ instanceId }) => instanceId).sort()).toEqual(sourceIds.sort());
    expect(s.state.memory).toBe(2);
  });

  it("takes the alternate CS evolution from a yellow Kentaurosmon for 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-041", as: "kentaurosmon" }],
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: { deck: Array(8).fill("BT1-011"), security: ["BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kentaurosmon").permanentId,
        instanceId: s.inst("omnimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kentaurosmon").topCard.cardId === "EX13-016");

    expect(s.perm("kentaurosmon").stack.map(({ cardId }) => cardId)).toEqual(["BT22-041"]);
    expect(s.state.memory).toBe(0);
  });

  it("plays through Assembly -7 with all four exact printed materials", async () => {
    const materials = ["BT1-025", "BT1-044", "BT1-010", "BT1-029"] as const;
    const s = setupEngine({
      0: {
        hand: [{ card: "EX13-016", as: "omnimon" }],
        trash: materials.map((card, index) => ({ card, as: `material${index}` })),
        deck: Array(8).fill("BT1-009"),
        security: ["BT1-011"],
      },
      1: { deck: Array(8).fill("BT1-011"), security: ["BT1-012"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("omnimon").instanceId,
        assembly: { materialInstanceIds: materials.map((_card, index) => s.inst(`material${index}`).instanceId) },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX13-016"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX13-016")!;
    expect(played.stack.map(({ cardId }) => cardId).sort()).toEqual([...materials].sort());
    expect(s.state.memory).toBe(2);
    expect(
      s.state.players[0]!.trash.filter(({ cardId }) => materials.includes(cardId as (typeof materials)[number])),
    ).toHaveLength(0);
  });

  it("plays through the public On Play route and keeps its own identity", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX13-016", as: "omnimon" }], deck: ["BT1-009", "BT1-010"], security: ["BT1-011"] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "enemyA" },
          { card: "BT1-010", as: "enemyB" },
        ],
        deck: ["BT1-011"],
        security: ["BT1-012"],
      },
    });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("omnimon").topCard.cardId === "EX13-016" &&
        s.state.turnSeat === 0 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("omnimon").topCard.cardId).toBe("EX13-016");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("lets the controller order the two simultaneous On Play effects (Q7254)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "deletionTarget" },
            { card: "BT1-010", as: "lockTarget" },
          ],
          deck: ["BT1-011"],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pendingOrder = s.state.pendingDecision!;
    const order = s.decisions.find(({ req }) => req.decisionId === pendingOrder.decisionId)!.req;
    expect(order.options?.triggerCardIds).toEqual(["EX13-016", "EX13-016"]);
    expect(order.options?.triggerKeys).toHaveLength(2);
    const chosenFirst = [...order.options!.triggerKeys!].reverse()[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [chosenFirst] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    const survivor = s.state.players[1]!.battleArea[0]!;
    expect(observe(s.engine).isRestricted(survivor.permanentId, "suspend")).toBe(true);
  });

  it("blocks two opposing attacks and leaves a third free", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX13-016", as: "omnimon" }], deck: ["BT1-009", "BT1-010"], security: ["BT1-011"] },
        1: {
          hand: [{ card: "BT1-014", as: "mainDummy" }],
          battleArea: [
            { card: "BT1-009", as: "lockedOne" },
            { card: "BT1-010", as: "lockedTwo" },
            { card: "BT1-013", as: "free" },
          ],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 0 && s.state.pendingDecision === undefined && s.state.phase === "Main");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).isRestricted(s.perm("lockedOne").permanentId, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lockedTwo").permanentId, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("free").permanentId, "suspend")).toBe(false);

    for (const key of ["lockedOne", "lockedTwo"] as const) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(key).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual(expect.objectContaining({ ok: false, reason: "illegal-target" }));
    }
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("free").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
  });

  it("keeps the lock through its own turn and expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX13-016", as: "omnimon" },
            { card: "BT1-014", as: "ownDummy" },
          ],
          deck: Array(12).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: {
          hand: [{ card: "BT1-014", as: "opponentDummy" }],
          battleArea: [{ card: "BT1-009", as: "locked" }],
          deck: Array(12).fill("BT1-011"),
          security: ["BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 0 && s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(s.perm("locked").permanentId, "suspend")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("locked").permanentId, "suspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("locked").permanentId, "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
  });

  it("digivolves from a red WarGreymon and deletes only an equal-stack opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "warGreymon" }],
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oneSource", under: ["BT1-010"] },
            { card: "BT1-013", as: "twoSources", under: ["BT1-010", "BT1-014"] },
          ],
          deck: Array(8).fill("BT1-011"),
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warGreymon").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warGreymon").topCard.cardId === "EX13-016" && s.state.pendingDecision === undefined);

    expect(s.perm("warGreymon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-025"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("twoSources").permanentId,
    ]);
  });

  it("deletes an opponent Digimon with no more stack cards than Omnimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX13-016", as: "omnimon" }], deck: ["BT1-009", "BT1-010"], security: ["BT1-011"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "zeroStack" },
            { card: "BT1-015", as: "oneStack", under: ["BT1-010"] },
          ],
          deck: ["BT1-011"],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("oneStack").permanentId,
    ]);
    const deletePrompt = s.decisions.find(({ req }) => req.kind === "optional");
    expect(deletePrompt?.req.options?.effectText).toBe(
      "[On Play] [When Digivolving] [Counter] [Once Per Turn] You may delete 1 of your opponent's Digimon with as many digivolution cards as this Digimon or fewer.",
    );
  });

  it("leaves both opposing Digimon when the optional stack-count deletion is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX13-016", as: "omnimon" }], deck: ["BT1-009", "BT1-010"], security: ["BT1-011"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-011"],
          security: ["BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("uses two same-level sources to survive a public opponent bounce", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "warGreymon", under: ["BT1-044", "AD1-004"] }],
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: Array(10).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-086", as: "blueAnchor" }],
          hand: [{ card: "ST2-16", as: "bounce" }],
          deck: Array(10).fill("BT1-011"),
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourceIds = s.perm("warGreymon").stack.map(({ instanceId }) => instanceId);
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warGreymon").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warGreymon").topCard.cardId === "EX13-016");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("bounce").instanceId));

    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("warGreymon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("omnimon").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.filter(({ instanceId }) => sourceIds.includes(instanceId))).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("omnimon").instanceId);
  });

  it("cannot pay the replacement when Omnimon has only one underlying source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-016", as: "omnimon", under: ["BT1-025"] }],
          deck: Array(10).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "blueAnchor" }],
          hand: [{ card: "ST2-16", as: "bounce" }],
          deck: Array(10).fill("BT1-011"),
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("bounce").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX13-016")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-025");
  });

  it("leaves Omnimon when the optional replacement payment is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-016", as: "omnimon", under: ["BT1-025", "BT1-044"] }],
          deck: Array(10).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "blueAnchor" }],
          hand: [{ card: "ST2-16", as: "bounce" }],
          deck: Array(10).fill("BT1-011"),
          security: ["BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("bounce").instanceId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX13-016")).toBe(false);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX13-016")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-025", "BT1-044"]),
    );
  });

  it("activates its delete effect from a public Counter window after a real turn transition", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-016", as: "omnimon" }],
          deck: Array(10).fill("BT1-009"),
          security: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "deleteTarget", under: ["BT1-010"] }],
          hand: [{ card: "BT19-020", as: "attacker" }],
          deck: Array(10).fill("BT1-011"),
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("omnimon").topCard.cardId === "EX13-016");
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("deleteTarget").permanentId),
    ).toBe(true);
    expect(s.perm("deleteTarget").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("attacker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").topCard.cardId === "BT19-020");
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(
      ({ instanceId }) => instanceId === s.perm("omnimon").topCard.instanceId,
    );
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === attackerId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("allows only one Counter activation per attack when two Omnimon are eligible (Q7253)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-016", as: "first" },
            { card: "EX13-016", as: "second" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }],
          deck: ["BT1-012"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const first = opened.eligibleCounters.find((entry) => entry.instanceId === s.perm("first").topCard.instanceId)!;
    const second = opened.eligibleCounters.find((entry) => entry.instanceId === s.perm("second").topCard.instanceId)!;
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: first.instanceId,
        effectKey: first.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: second.instanceId,
        effectKey: second.effectKey,
      }).ok,
    ).toBe(false);
  });
});
