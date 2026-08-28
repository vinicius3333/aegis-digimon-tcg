import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const KOJI = "BT17-083";

/** Observe the production OnStartTurn window without replacing or manually firing it. */
function observeStartTurn(s: EngineSetup): number[] {
  const memoryAfterStartTurn: number[] = [];
  const engineAny = s.engine as unknown as {
    fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
  };
  const original = engineAny.fireTiming.bind(s.engine);
  engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) memoryAfterStartTurn.push(s.state.memory);
    return result;
  };
  return memoryAfterStartTurn;
}

describe("BT17-083 Koji Minamoto — inherited hand-add trigger", () => {
  it("matches the immutable catalog identity and printed clauses", () => {
    expect(getCardDefinition(KOJI)).toMatchObject({
      nameEn: "Koji Minamoto",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      securityEffectText: "[Security] Play this card without paying the cost.",
      inheritedEffectText: expect.stringContaining("When an effect adds cards to your hand"),
    });
  });

  it("keeps only the Security play and Start of Your Turn effects, with a scoped inherited watcher", () => {
    const compiled = runtimeCompiledCard(KOJI)!;
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual(["Security", "StartOfYourTurn", "YourTurn"]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          fireCondition: { kind: "triggerByYourDigimonEffect" },
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "GainKeyword", target: { isSelf: true }, keyword: { keyword: "Jamming" }, duration: "forTheTurn" },
          ],
        },
      ],
    });
  });

  it("naturally gains memory and grants its host Jamming when a Digimon effect draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: KOJI, as: "koji" }] }],
          hand: [{ card: "BT17-021", as: "labramon" }, { card: "BT17-024", as: "material" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not trigger from the digivolution bonus hand addition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: KOJI, as: "koji" }] }],
          hand: [{ card: "BT1-014", as: "evolver" }],
          deck: [{ card: "BT1-011", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId));

    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the natural start of your turn only from 2 or less", async () => {
    const low = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [KOJI] }],
          deck: ["BT1-010"],
          hand: ["BT1-010"],
        },
        1: { deck: ["BT1-010"], hand: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    low.state.memory = 2;
    low.state.turnSeat = 0;
    const lowMemoryAfterStartTurn = observeStartTurn(low);
    await low.ready();
    await advance(low.engine).runTurn(0);
    expect(lowMemoryAfterStartTurn).toEqual([3]);
    assertNoLoudGap(low);

    const high = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [KOJI] }],
          deck: ["BT1-010"],
          hand: ["BT1-010"],
        },
        1: { deck: ["BT1-010"], hand: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    high.state.memory = 4;
    high.state.turnSeat = 0;
    const highMemoryAfterStartTurn = observeStartTurn(high);
    await high.ready();
    await advance(high.engine).runTurn(0);
    expect(highMemoryAfterStartTurn).toEqual([4]);
    assertNoLoudGap(high);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: KOJI, as: "securityKoji" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityKoji").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
