import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-085.js";

describe("BT22-085 Rina Shinomiya", () => {
  it("sets memory to 3 at the start of your turn when memory is 2 or less", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("gives exactly one of your Veedramon-name Digimon +3000 DP on play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
        },
      },
    });
  });

  it("applies Jamming to the attacking Veedramon, not an arbitrary Digimon", () => {
    const trigger = compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0];
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
      },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          target: { sourceRef: "triggerSubject", count: 1 },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect((trigger as any).actions[0].cost).toMatchObject({
      kind: "return",
      raw: "by returning this Tamer to the hand",
    });
  });

  it("plays itself from security without paying its cost", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { isSelf: true, count: 1 },
    });
  });

  it("applies the On Play DP bonus to Veedramon through a public play intent", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT22-085", as: "rina" }], battleArea: [{ card: "BT22-022", as: "veedramon" }] },
    });
    const id = s.inst("rina").instanceId;
    const before = s.perm("veedramon").currentDP;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
    await settle(() => s.perm("veedramon").currentDP !== before);
    expect(s.perm("veedramon").currentDP).toBe(before + 3000);
  });

  it("sets low memory to 3 at the public start-of-turn timing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-085", as: "rina" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fireGlobal(EffectTiming.OnStartTurn);
    await settle();
    expect(s.state.memory).toBe(3);
  });

  it("returns Rina and grants Jamming to the attacking Veedramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", as: "veedramon" },
            { card: "BT22-085", as: "rina" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT22-085"));
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-085")).toBe(true);
  });

  it("plays Rina from security during a public security check", async () => {
    const s = setupEngine(
      { 0: { security: ["BT22-085"] }, 1: { battleArea: [{ card: "BT1-009", as: "attacker" }] } },
      { autoAcceptOptional: true },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-085"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-085")).toBe(true);
  });
});
