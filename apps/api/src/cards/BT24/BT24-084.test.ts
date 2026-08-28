import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT24-084.js";

describe("BT24-084 Inori Misono", () => {
  it("gains memory only at 4 or less at the start of your main phase", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
        },
      ],
    });
  });

  it("reacts only to your security removal and pays the suspend cost before free digivolution", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Aegiochusmon"], match: "name" }],
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from security without paying the cost", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    });
  });

  it.each([
    [4, 5],
    [5, 5],
  ])("changes memory from %i to %i at the printed boundary", async (memory, expected) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-084", as: "inori" }] } });
    s.state.memory = memory;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("inori"));

    expect(s.state.memory).toBe(expected);
  });

  it("suspends Inori to free-digivolve exact Aegiomon after own security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => s.perm("aegiomon").topCard.instanceId === s.inst("aegiochusmon").instanceId);

    expect(s.perm("inori").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("does not trigger when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.perm("inori").isSuspended).toBe(false);
    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-034");
  });

  it("does not digivolve when Inori cannot pay the suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori", suspended: true },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-034");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("aegiochusmon").instanceId);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-084", as: "inori" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("inori"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("inori").instanceId),
    );
  });
});
