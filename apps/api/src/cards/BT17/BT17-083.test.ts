import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../BT7/BT7-091.js";
import "./BT17-083.js";
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
      effectText: expect.stringContaining("[Security] Play this card without paying the cost."),
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
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "GainKeyword", target: { isSelf: true }, keyword: { keyword: "Jamming" }, duration: "forTheTurn" },
          ],
        },
      ],
    });
  });

  it('does not narrow the printed "an effect" wording to your Digimon\'s effects', () => {
    const compiled = runtimeCompiledCard(KOJI)!;
    const watcher = compiled.effects?.[2]?.actions?.[0] as { fireCondition?: unknown };
    expect(watcher.fireCondition).toBeUndefined();
    expect(getCardDefinition(KOJI)?.inheritedEffectText).toBe(
      "[Your Turn] [Once Per Turn] When an effect adds cards to your hand, gain 1 memory. Then, this Digimon gains \uff1cJamming\uff1efor the turn.",
    );
  });

  it("naturally gains memory and grants its host Jamming when a Digimon effect draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: KOJI, as: "koji" }] }],
          hand: [
            { card: "BT17-021", as: "labramon" },
            { card: "BT17-024", as: "material" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
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

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the natural start of your turn only from 2 or less", async () => {
    const low = setupEngine(
      {
        0: {
          battleArea: [{ card: KOJI, as: "koji" }],
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
          battleArea: [{ card: KOJI, as: "koji" }],
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

  it("fires for a Tamer effect whose net hand size is unchanged, once per turn only (Q2861)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: KOJI, as: "koji" }] }],
          hand: [
            { card: "BT7-091", as: "koichi" },
            { card: "BT7-091", as: "koichi2" },
            { card: "BT7-091", as: "koichi3" },
            { card: "BT1-012", as: "fodder" },
            { card: "BT1-013", as: "fodder2" },
            { card: "BT1-013", as: "fodder3" },
          ],
          deck: [
            { card: "BT1-011", as: "drawn" },
            { card: "BT1-014", as: "drawn2" },
            { card: "BT1-014", as: "drawn3" },
            "BT1-010",
            "BT1-010",
          ],
        },
        1: { deck: ["BT1-010", "BT1-010"], hand: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.memory = 9;
    preferred.push(s.inst("fodder").instanceId, s.inst("fodder2").instanceId, s.inst("fodder3").instanceId);
    const handSizeBefore = s.state.players[0]!.hand.length;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koichi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Jamming"));

    // Q2861: the effect draws 1 then trashes 1, so the add is net-zero, and the watcher still
    // fires. Koichi is a Tamer, so this also proves the printed "an effect" is not narrowed to
    // your Digimon's effects. Memory: 9 - 3 (Koichi's cost) + 1 (Koji) = 7.
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koichi2").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.length === handSizeBefore - 2 &&
        !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("fodder2").instanceId),
    );

    // Once Per Turn: the second add in the same turn grants no further memory (7 - 3 = 4).
    expect(s.state.memory).toBe(4);

    // The limit resets on the next own turn, reached through the real turn loop.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeThirdPlay = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koichi3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("fodder3").instanceId));
    expect(s.state.memory).toBe(memoryBeforeThirdPlay - 3 + 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    assertNoLoudGap(s);
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
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
