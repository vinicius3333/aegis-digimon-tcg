import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX5-016.js";

const TOKEN = "TOKEN-Amon-of-Crimson-Flame";

function gainTwoMemoryEffect(s: ReturnType<typeof setupEngine>, alias = "host") {
  const effect = observe(s.engine)
    .activatableEffects(s.perm(alias))
    .find((entry) => /Gain 2 memory/i.test(entry.description ?? ""));
  return effect?.instanceId === undefined ? undefined : { ...effect, instanceId: effect.instanceId };
}

describe("EX5-016 Lunamon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition("EX5-016")).toMatchObject({
      cardId: "EX5-016",
      nameEn: "Lunamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 0 },
        { color: "Red", level: 2, memoryCost: 0 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mammal", "Night Claw"],
      effectText: expect.stringContaining("[Start of Your Main Phase]"),
      inheritedEffectText: expect.stringContaining("[Main] [Once Per Turn]"),
    });

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "placeOwnTopAtStackBottom",
            target: {
              filter: {
                isSelfRef: true,
                controllerDefault: "mine",
                zone: "battleArea",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Night Claw", "Light Fang"], match: "trait" }],
              },
              count: 1,
            },
          },
        },
      ],
    });
  });

  it("returns exactly one own battle-area Digimon at Start of Main and gains two memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-016", as: "lunamon" },
            { card: "BT1-009", as: "returnTarget" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("returnTarget").instanceId);
    s.state.memory = 0;
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lunamon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnTarget").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX5-016"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("allows declining the optional Start of Main return without changing memory or zones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-016", as: "lunamon" },
            { card: "BT1-009", as: "returnTarget" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lunamon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT1-009",
      "EX5-016",
    ]);
  });

  it("allows Q3557: Lunamon can return itself to the hand for two memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX5-016", as: "lunamon" }], deck: ["BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lunamon").topCard!.instanceId);
    s.state.memory = 0;
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lunamon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lunamon").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-016");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("proves Q3555 by rotating the physical top card to the bottom of its own stack", async () => {
    for (const host of ["EX5-017", "EX5-007"] as const) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: host, as: "host", under: ["EX5-016"] }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await s.ready();

      const effect = gainTwoMemoryEffect(s);
      expect(effect).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: effect!.instanceId,
          effectKey: effect!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === 2 && s.perm("host").topCard?.cardId === "EX5-016");

      expect(s.perm("host").topCard?.cardId).toBe("EX5-016");
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([host]);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("proves Q3556: physical copies cannot create infinite memory and reset on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-017", as: "host", under: ["EX5-016", "EX5-016"] },
            { card: "BT1-009", as: "returnTarget" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("returnTarget").instanceId);
    s.state.memory = 5;
    await s.ready();
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const sourceA = s.perm("host").stack[0]!;
    const sourceB = s.perm("host").stack[1]!;
    const originalTop = s.perm("host").topCard!;
    const first = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceB.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(first).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceB.instanceId,
        effectKey: first!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7 && s.perm("host").topCard?.instanceId === sourceB.instanceId);

    const second = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceA.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(second).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceA.instanceId,
        effectKey: second!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 9 && s.perm("host").topCard?.instanceId === sourceA.instanceId);

    expect(
      observe(s.engine)
        .activatableEffects(s.perm("host"))
        .filter((entry) => /Gain 2 memory/i.test(entry.description ?? "")),
    ).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const reset = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceB.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(reset).toBeDefined();
    const beforeReset = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceB.instanceId,
        effectKey: reset!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === beforeReset + 2 && s.perm("host").topCard?.instanceId === originalTop.instanceId,
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceA.instanceId, sourceB.instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("does not offer the inherited effect when the host top card lacks either trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-016"] }] } });
    s.state.memory = 0;
    await s.ready();

    expect(gainTwoMemoryEffect(s)).toBeUndefined();
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-016"]);
    expect(s.state.memory).toBe(0);
  });

  it("proves Q3558: returning Mother D-Reaper satisfies the cost but routes to the Digi-Egg deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-016", as: "lunamon" },
            { card: "EX2-007", as: "mother" },
            { card: "BT14-030", as: "watcher" },
          ],
          eggDeck: ["BT1-001"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    const resolution = advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lunamon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision;
    expect(decision?.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("mother").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.eggDeck.some((card) => card.cardId === "EX2-007"));
    await resolution;

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["BT1-001", "EX2-007"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX2-007");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("proves Q3559: returning a token satisfies the cost but removes it without a hand event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-016", as: "lunamon" },
            { card: TOKEN, as: "token" },
            { card: "BT14-030", as: "watcher" },
          ],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    const resolution = advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lunamon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision;
    expect(decision?.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("token").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.topCard?.cardId !== TOKEN));
    await resolution;

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain(TOKEN);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain(TOKEN);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX5-001", "EX5-002"] as const)("legally evolves from the %s red/blue level-2 route", async (egg) => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: egg, as: "egg" },
          hand: [{ card: "EX5-016", as: "lunamon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("lunamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.cardId === "EX5-016");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual([egg]);
    expect(s.state.memory).toBe(5);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("egg").inBreeding);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("EX5-016");
  });

  it("rejects a level-3 source for Lunamon's level-2 evolution requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "illegalBase" }],
        hand: [{ card: "EX5-016", as: "lunamon" }],
      },
    });
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("illegalBase").permanentId,
        instanceId: s.inst("lunamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("illegalBase").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("illegalBase").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
