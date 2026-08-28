import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-090.js";

describe("BT23-090 Keisuke Amasawa", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-090")).toMatchObject({
      cardId: "BT23-090",
      nameEn: "Keisuke Amasawa",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("sets memory to 3 at 2 or less and leaves higher memory unchanged", async () => {
    for (const [initial, expected] of [
      [2, 3],
      [4, 4],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: "BT23-090", as: "keisuke" }] } });
      s.state.memory = initial;
      await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
        EffectTiming.OnStartTurn,
      );
      expect(s.state.memory).toBe(expected);
    }
  });

  it("atomically suspends Keisuke, returns a Hudie, and plays a CS Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-090", as: "keisuke" },
            { card: "BT23-101", as: "hudie" },
          ],
          hand: [{ card: "BT23-081", as: "chitose" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hudieId = s.perm("hudie").topCard!.instanceId;
    const chitoseId = s.inst("chitose").instanceId;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );
    expect(s.perm("keisuke").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === hudieId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === chitoseId)).toBe(true);
  });

  it("does not suspend or play when no Hudie can pay the second cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-090", as: "keisuke" }],
          hand: [{ card: "BT23-081", as: "chitose" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const chitoseId = s.inst("chitose").instanceId;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );
    expect(s.perm("keisuke").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === chitoseId)).toBe(true);
  });

  it("continuously gives +1000 DP only to friendly Hudie Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-090", as: "keisuke" },
          { card: "BT23-101", as: "hudie" },
          { card: "BT1-009", as: "plain" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("hudie").currentDP).toBe(8000);
    expect(s.perm("plain").currentDP).toBe(s.perm("plain").baseDP);
  });

  it("gates the End of Your Turn CS Tamer play behind suspend and Hudie return costs", () => {
    const end = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn") as any;
    expect(end.actions).toHaveLength(1);
    expect(end.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      cost: { kind: "compound", costs: [{ kind: "suspend" }, { kind: "return", to: "hand" }] },
    });
  });

  it("sets memory at turn start and grants all Hudie Digimon +1000 DP", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn") as any;
    expect(start.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
    const aura = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(aura).toMatchObject({ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { count: "all" } });
  });
});
