import { describe, expect, it } from "vitest";
import { EffectTiming, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { assertNoLoudGap, settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT14-101.js";
import "../index.js";

const WARGREYMON = "BT14-101";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string | undefined {
  const source = observe(s.engine).cardSource(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith(`${WARGREYMON}/`))
    ?.effectKey;
}

describe("BT14-101", () => {
  it("allows the hand digivolution when Tai and an opposing 10000 DP Digimon are present", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", isFromHand: true, condition: { kind: "allOf" } });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      costOverride: 4,
      ignoreRequirements: true,
      payCost: true,
    });
  });
  it("grants Raid and attack, then grants Security Attack +1 and Piercing with a Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Raid" } }, { kind: "Attack" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "GainKeyword", keyword: { keyword: "Piercing" } },
      ],
    });
  });

  it("activates from hand, evolves a bare Agumon, raids the highest unsuspended Digimon, and grants both attack keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-007", as: "agumon" },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [{ card: WARGREYMON, as: "wargreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-025", as: "highest" },
            { card: "BT14-069", as: "lower" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const handCard = s.inst("wargreymon");
    const highestId = s.perm("highest").permanentId;
    const effectKey = handMainEffectKey(s, handCard);
    expect(effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: handCard.instanceId, effectKey: effectKey! }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("agumon").topCard?.cardId === WARGREYMON && s.events.some((event) => event.kind === "combatResolved"),
    );

    // A bare Lv.3 Agumon is deliberately used here: ignoreRequirements waives the normal Lv.5
    // Greymon evolution requirement while the separate costOverride still pays 4 memory.
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-007"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handCard.instanceId)).toBe(false);
    expect(s.state.memory).toBe(6);

    // The forced attack begins as a player attack, then the real Raid keyword switches it to
    // the highest-DP unsuspended Digimon. The lower-DP Digimon remains in play.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lower").permanentId),
    ).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Raid")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("agumon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasPierce(s.perm("agumon"))).toBe(true);
    // Piercing plus Security Attack +1 produces two checks after Raid wins the battle.
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
