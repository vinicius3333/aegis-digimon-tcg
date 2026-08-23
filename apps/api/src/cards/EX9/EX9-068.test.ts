import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import compiled from "./EX9-068.js";

describe("EX9-068", () => {
  const source = {
    instanceId: "source",
    cardId: "EX9-068",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers start-of-turn memory setting and security play", () => {
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers the cost-seven-or-more Cyborg/Machine/DM play response", () =>
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1));
  it("encodes the qualifying play response and its suspend cost as compiled IR", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], playCostGte: 7 },
          cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
          actions: [
            { kind: "Draw", amount: 1 },
            { kind: "GainMemory", amount: 1 },
            { kind: "PlaceUnder", underFilter: { isTriggerSource: true }, faceDown: true },
          ],
        },
      ],
    });
  });
  it("sets memory to three at the start of your turn when memory is two or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-068", as: "source" }] } });
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("source"));

    expect(s.state.memory).toBe(3);
  });
  it("suspends, draws, gains memory, and places a hand card face-down under a qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-068", as: "source" },
            { card: "EX9-065", as: "subject" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });
    await settle(() => s.perm("source").isSuspended && s.state.memory === 1 && s.perm("subject").stack.length === 1);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.perm("subject").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
  it("does not respond to a Digimon with play cost below seven", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-068", as: "source" },
            { card: "BT1-009", as: "subject" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX9-068", as: "source" }] } });
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-068"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-068")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX9-068")).toBe(false);
  });
});
