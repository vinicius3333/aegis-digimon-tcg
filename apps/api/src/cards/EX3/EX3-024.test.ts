import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-058.js";
import "../BT1/BT1-040.js";
import "./EX3-024.js";
import "../index.js"; // the full catalog is registered in a real match

async function waitForNewDecision(s: ReturnType<typeof setupEngine>, previousCount: number) {
  await settle(() => s.decisions.length > previousCount && s.state.pendingDecision !== undefined);
  expect(s.decisions.length).toBeGreaterThan(previousCount);
  return s.state.pendingDecision!;
}

function candidateIds(decision: NonNullable<ReturnType<typeof setupEngine>["state"]["pendingDecision"]>): string[] {
  const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[] };
  return payload.candidateInstanceIds ?? [];
}

function visibleIds(decision: NonNullable<ReturnType<typeof setupEngine>["state"]["pendingDecision"]>): string[] {
  const payload = JSON.parse(decision.payloadJson) as { visibleInstanceIds?: string[] };
  return payload.visibleInstanceIds ?? [];
}

describe("EX3-024 Slayerdramon", () => {
  it("has the official errata identity, normal evolution costs, and alternate evolution rules", () => {
    const definition = getCardDefinition("EX3-024")!;
    expect(definition).toMatchObject({
      cardId: "EX3-024",
      nameEn: "Slayerdramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      rarity: "R",
      imageId: "EX3-024-Errata",
    });
    expect(definition.effectText).toContain("Digivolve: 3 from [Wingdramon] or [Groundramon]");
    expect(definition.effectText).toContain("your opponent attacks with 1 of their Digimon");
    expect(definition.inheritedEffectText).toBe(
      "[Start of Opponent's Main Phase] By suspending 1 of your Digimon with [Dramon] or [Examon] in its name, your opponent attacks with 1 of their Digimon.",
    );
  });

  it("lets the correct players pay the Dramon/Examon cost and choose the forced attacker and attack target", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-024", as: "slayerdramon" },
          { card: "EX3-020", as: "wingdramonCost" },
          { card: "EX3-074", as: "examonCost" },
          { card: "BT1-025", as: "invalidDragonkin" },
        ],
        security: ["BT8-090", "BT8-090"],
      },
      1: {
        battleArea: [
          { card: "BT1-029", as: "firstAttacker" },
          { card: "BT1-030", as: "chosenAttacker" },
        ],
        security: ["BT8-090", "BT8-090"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const flow = s.engine.runOneTurn();
    let count = 0;

    const optional = await waitForNewDecision(s, count++);
    expect(optional.kind).toBe("optional");
    expect(optional.seat).toBe(0);
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-024");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    const cost = await waitForNewDecision(s, count++);
    expect(cost.seat).toBe(0);
    expect(candidateIds(cost)).toEqual(
      expect.arrayContaining([
        s.perm("slayerdramon").permanentId,
        s.perm("wingdramonCost").permanentId,
        s.perm("examonCost").permanentId,
      ]),
    );
    expect(candidateIds(cost)).not.toContain(s.perm("invalidDragonkin").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("wingdramonCost").permanentId] },
      }),
    ).toEqual({ ok: true });

    const attacker = await waitForNewDecision(s, count++);
    expect(attacker.seat).toBe(1);
    expect(candidateIds(attacker)).toEqual(
      expect.arrayContaining([s.perm("firstAttacker").permanentId, s.perm("chosenAttacker").permanentId]),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: attacker.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosenAttacker").permanentId] },
      }),
    ).toEqual({ ok: true });

    const attackTarget = await waitForNewDecision(s, count++);
    expect(attackTarget.seat).toBe(1);
    expect(candidateIds(attackTarget)).toContain("player");
    expect(s.perm("wingdramonCost").isSuspended).toBe(true);
    expect(candidateIds(attackTarget)).toContain(s.perm("wingdramonCost").permanentId);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: attackTarget.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => mainPhase.isOpen && s.state.phase === Phase.Main && s.state.players[0]!.security.length === 1);

    expect(s.perm("wingdramonCost").isSuspended).toBe(true);
    expect(s.perm("examonCost").isSuspended).toBe(false);
    expect(s.perm("chosenAttacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await flow;
  });

  it("Q3397 allows the opponent to choose a Digimon that cannot attack, then ends without an attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-024", as: "slayerdramon" },
            { card: "EX3-020", as: "cost" },
          ],
          security: ["BT8-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-029", as: "legalAttacker" },
            { card: "BT2-058", as: "cannotAttack" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId, s.perm("cannotAttack").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("slayerdramon"));

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.perm("cannotAttack").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.decisions.some(
        ({ req }) => req.seat === 1 && req.options?.candidateInstanceIds?.includes(s.perm("cannotAttack").permanentId),
      ),
    ).toBe(true);
  });

  it("Q3398 can pay the cost with no opposing Digimon and then ends without an attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-024", as: "slayerdramon" },
            // A [Dramon] cost Digimon that does NOT unsuspend itself: EX3-074 Examon prints
            // "when this Digimon becomes suspended, unsuspend it", which would undo the cost.
            { card: "EX3-020", as: "dramonCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("dramonCost").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("slayerdramon"));

    expect(s.perm("dramonCost").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-024")).toHaveLength(2);
  });

  it("Q3399 resolves When Attacking before the cost Digimon's when-suspended trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-024", as: "slayerdramon" },
          { card: "EX3-020", as: "otherCost" },
        ],
        security: ["BT8-090"],
      },
      1: {
        battleArea: [
          { card: "BT1-040", as: "attacker" },
          { card: "BT1-029", as: "otherAttacker" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const flow = s.engine.runOneTurn();
    let count = 0;
    const optional = await waitForNewDecision(s, count++);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const cost = await waitForNewDecision(s, count++);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("slayerdramon").permanentId] },
      }),
    ).toEqual({ ok: true });
    const attacker = await waitForNewDecision(s, count++);
    expect(s.perm("slayerdramon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: attacker.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    const target = await waitForNewDecision(s, count++);
    expect(s.perm("slayerdramon").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: target.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        mainPhase.isOpen &&
        s.state.memory === 3 &&
        !s.perm("slayerdramon").isSuspended &&
        s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-024").length >= 2,
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("slayerdramon").isSuspended).toBe(false);
    const whenAttacking = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-040",
    );
    const whenSuspended = s.events.findIndex(
      (event, index) => index > whenAttacking && event.kind === "effectResolved" && event.sourceCardId === "EX3-024",
    );
    expect(whenAttacking).toBeGreaterThanOrEqual(0);
    expect(whenSuspended).toBeGreaterThan(whenAttacking);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await flow;
  });

  it("Q3400 exposes both copies in the timing but resolves only one forced attack declaration", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-024", as: "firstSlayer" },
            { card: "EX3-024", as: "secondSlayer" },
            { card: "EX3-020", as: "firstCost" },
            { card: "EX3-041", as: "secondCost" },
          ],
          security: ["BT8-090", "BT8-090"],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "firstAttacker" },
            { card: "BT1-029", as: "secondAttacker" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoOrderTriggers: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const flow = s.engine.runOneTurn();
    let count = 0;

    const orderTriggers = await waitForNewDecision(s, count++);
    const triggerKeys = (JSON.parse(orderTriggers.payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? [];
    expect(triggerKeys).toHaveLength(2);
    expect(
      s.engine.applyIntent(orderTriggers.seat, {
        type: "respondDecision",
        decisionId: orderTriggers.decisionId,
        response: { kind: "orderTriggers", order: [triggerKeys[0]!] },
      }),
    ).toEqual({ ok: true });

    const firstOptional = await waitForNewDecision(s, count++);
    expect(firstOptional.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const firstCost = await waitForNewDecision(s, count++);
    const firstCostIds = ["firstSlayer", "secondSlayer", "firstCost", "secondCost"].map(
      (alias) => s.perm(alias).permanentId,
    );
    expect(candidateIds(firstCost).sort()).toEqual([...firstCostIds].sort());
    expect(visibleIds(firstCost).sort()).toEqual([...firstCostIds].sort());
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstCost.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstCost").permanentId] },
      }),
    ).toEqual({ ok: true });
    const firstAttacker = await waitForNewDecision(s, count++);
    const attackerIds = [s.perm("firstAttacker").permanentId, s.perm("secondAttacker").permanentId];
    expect(candidateIds(firstAttacker).sort()).toEqual([...attackerIds].sort());
    expect(visibleIds(firstAttacker).sort()).toEqual([...attackerIds].sort());
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: firstAttacker.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstAttacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    const firstTarget = await waitForNewDecision(s, count++);
    expect(candidateIds(firstTarget).sort()).toEqual(["player", s.perm("firstCost").permanentId].sort());
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: firstTarget.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });

    const secondOptional = await waitForNewDecision(s, count++);
    expect(secondOptional).toMatchObject({ seat: 0, kind: "optional" });
    expect(s.decisions.at(-1)!.req).toMatchObject({
      seat: 0,
      kind: "optional",
      sourceCardId: "EX3-024",
      options: {
        timing: "StartOfOpponentsMainPhase",
        effectText: expect.stringContaining("your opponent attacks"),
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    const secondCost = await waitForNewDecision(s, count++);
    expect(secondCost).toMatchObject({ seat: 0, kind: "chooseTargets" });
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 1, max: 1 });
    const secondCostIds = ["firstSlayer", "secondSlayer", "secondCost"].map((alias) => s.perm(alias).permanentId);
    expect(candidateIds(secondCost).sort()).toEqual([...secondCostIds].sort());
    expect(visibleIds(secondCost).sort()).toEqual([...firstCostIds].sort());
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondCost.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstSlayer").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });

    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        mainPhase.isOpen &&
        s.state.pendingDecision === undefined,
      500,
    );
    expect(s.decisions.filter(({ req }) => req.seat === 1 && req.kind === "chooseTargets")).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({
        seat: 1,
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        attackerCardId: "BT1-030",
      }),
    ]);
    expect(s.perm("firstCost").isSuspended).toBe(true);
    expect(s.perm("firstSlayer").isSuspended).toBe(false);
    expect(s.perm("secondCost").isSuspended).toBe(false);
    expect(s.perm("firstAttacker").isSuspended).toBe(true);
    expect(s.perm("secondAttacker").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX3-024")).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.seat === 1 && req.kind === "selectCards")).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await flow;
  });

  it("unsuspends itself once per turn when it becomes suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-024", as: "slayerdramon" }] } });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("slayerdramon").permanentId]);
    await settle(() => !s.perm("slayerdramon").isSuspended);
    expect(s.perm("slayerdramon").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("slayerdramon").permanentId]);
    expect(s.perm("slayerdramon").isSuspended).toBe(true);
  });

  it("provides the same opponent-chosen forced attack from its inherited effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-033", under: ["EX3-024"], as: "inheritedHost" },
            { card: "EX3-020", as: "cost" },
          ],
          security: ["BT8-090"],
        },
        1: {
          battleArea: [{ card: "BT1-029", as: "attacker" }],
          security: ["BT8-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId, s.perm("attacker").permanentId, "player");
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("inheritedHost"));

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.decisions.at(0)!.req.sourceCardId).toBe("EX3-024");
  });

  it("declining the optional activation pays no cost and causes no attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-024", as: "slayerdramon" },
          { card: "EX3-020", as: "cost" },
        ],
        security: ["BT8-090"],
      },
      1: { battleArea: [{ card: "BT1-029", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const flow = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("slayerdramon"));
    const optional = await waitForNewDecision(s, 0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await flow;

    expect(s.perm("cost").isSuspended).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it.each(["EX3-020", "EX3-041"])("digivolves from %s for the alternate cost of 3", async (baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX3-024", as: "slayerdramon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("slayerdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("slayerdramon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it.each(["BT1-038", "BT1-075"])(
    "digivolves from the printed blue or green level 5 route using %s",
    async (baseCard) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX3-024", as: "slayerdramon" }],
        },
      });
      s.state.memory = 4;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("slayerdramon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("slayerdramon").instanceId);

      expect(s.state.memory).toBe(0);
    },
  );
});
