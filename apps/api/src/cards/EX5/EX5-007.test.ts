import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-007.js";
import "../index.js";

describe("EX5-007 Coronamon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition("EX5-007")).toMatchObject({
      cardId: "EX5-007",
      nameEn: "Coronamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      types: ["Beast", "Light Fang"],
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 0 },
        { color: "Blue", level: 2, memoryCost: 0 },
      ],
      effectText: expect.stringContaining("[Start of Your Main Phase]"),
      inheritedEffectText: expect.stringContaining("[Main] [Once Per Turn]"),
    });

    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Tamer"],
              nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
            },
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
            kind: "place",
            target: {
              filter: {
                isSelfRef: true,
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
              },
              count: 1,
              isSelf: true,
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    });
  });

  it("gains the start-of-main memory only for an own matching Tamer", async () => {
    const own = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-007", as: "source" },
            { card: "EX5-064", as: "tamer" },
          ],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    own.state.memory = 5;
    await own.ready();
    const ownLoop = own.engine.startTurnLoop();
    await advance(own.engine).waitForMainPhase(0);
    await own.ready();
    expect(own.state.memory).toBe(6);
    expect(own.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await ownLoop;

    const opponentOnly = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-007", as: "source" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "EX5-064", as: "opponentTamer" }], deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    opponentOnly.state.memory = 5;
    await opponentOnly.ready();
    const opponentLoop = opponentOnly.engine.startTurnLoop();
    await advance(opponentOnly.engine).waitForMainPhase(0);
    await opponentOnly.ready();
    expect(opponentOnly.state.memory).toBe(5);
    expect(opponentOnly.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await opponentLoop;
  });

  it("publicly rotates the top traited card to the stack bottom and promotes the prior source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-007"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const effect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => /Gain 2 memory/i.test(entry.description ?? ""));
    expect(effect).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").stack[0]!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2 && s.perm("host").topCard?.cardId === "EX5-007");

    expect(s.perm("host").topCard?.cardId).toBe("EX5-007");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-008"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires the public placement event for Sunmon and preserves the rotated stack before its legal evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-001", "EX5-007"] }],
          hand: [{ card: "BT1-014", as: "evolution" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("evolution").instanceId);
    s.state.memory = 3;
    await s.ready();
    const effect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => /Gain 2 memory/i.test(entry.description ?? ""));
    expect(effect).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").stack[1]!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");

    expect(s.state.memory).toBe(4);
    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-008", "EX5-001", "EX5-007"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("allows each physical copy once, blocks cycling back, and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-007", "EX5-007"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceA = s.perm("host").stack[0]!;
    const sourceB = s.perm("host").stack[1]!;
    const originalTop = s.perm("host").topCard!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const firstEffect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceB.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(firstEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceB.instanceId,
        effectKey: firstEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7 && s.perm("host").topCard?.instanceId === sourceB.instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([originalTop.instanceId, sourceA.instanceId]);

    // Q3528 preserves sourceB's spent record, while sourceA remains an
    // independent physical copy with its own first Once Per Turn use.
    const secondCopyEffect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceA.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(secondCopyEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceA.instanceId,
        effectKey: secondCopyEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 9 && s.perm("host").topCard?.instanceId === sourceA.instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceB.instanceId, originalTop.instanceId]);

    // Cycling back to sourceB in the same turn is now blocked: both copies
    // have spent their own Once Per Turn activation.
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

    const secondEffect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceB.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(secondEffect).toBeDefined();
    const beforeSecond = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceB.instanceId,
        effectKey: secondEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === beforeSecond + 2 && s.perm("host").topCard?.instanceId === originalTop.instanceId,
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceA.instanceId, sourceB.instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not rotate or gain memory when the host's top card lacks Light Fang or Night Claw", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-014", as: "host", under: ["EX5-007"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const effect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => /Gain 2 memory/i.test(entry.description ?? ""));
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").stack[0]!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-007"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
