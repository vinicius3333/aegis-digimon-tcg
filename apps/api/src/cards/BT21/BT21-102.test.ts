import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-102.js";
import "../index.js";

describe("BT21-102 Tai Kamiya", () => {
  it("verifies memory setting, attack draw cost, scalable Main play, and Security play", () => {
    const start = compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });

    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          playCostLte: 2,
          playCostLteScaling: {
            per: 1,
            filter: { controller: "mine", kind: ["Tamer"] },
            unit: "colors",
          },
          nameOrTrait: [{ tokens: ["ADVENTURE", "Hero"], match: "trait" }],
        },
      },
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { isSelfRef: true } },
    });

    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [
          { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      compiled.effects
        .flatMap((entry) => entry.actions)
        .some((action) => "ignoreRequirements" in action && action.ignoreRequirements === true),
    ).toBe(false);
  });

  it.each([
    [2, 3],
    [4, 4],
  ])("start of turn changes %i memory to %i", async (before, after) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-102", as: "tai" }] } });
    await s.ready();
    s.state.memory = before;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tai"));
    expect(s.state.memory).toBe(after);
  });

  it("suspends when an own Digimon attacks and draws exactly one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-102", as: "tai" },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("attacker").permanentId,
      subjectPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.perm("tai").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("uses the public attack intent to trigger Tai's draw and suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-102", as: "tai" },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.perm("tai").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("counts its white color, plays a cost-3 Hero, then returns itself to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-102", as: "tai" }],
          hand: [{ card: "BT21-009", as: "gatchmon" }],
          deck: [{ card: "BT1-001", as: "oldBottom" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("tai").instanceId,
        effectKey: `BT21-102/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-009"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-102")).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("tai").instanceId);
  });

  it("plays itself from Security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-102", as: "tai" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tai"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});
