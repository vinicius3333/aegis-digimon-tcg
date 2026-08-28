import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-091.js";

describe("BT22-091 Arata Sanada", () => {
  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
    });
  });

  it("sets memory to 3 when its owner's memory is 2 or less", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("redirects an opponent attack to one of your Unidentified or CS Digimon after suspending this Tamer", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OpponentsTurn" && !effect.isInherited)
      ?.actions[0];
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "RedirectAttack",
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Unidentified", "CS"], match: "trait" }],
            },
          },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  it("gives Eater Adam the once-per-turn optional inherited redirection", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              condition: { kind: "selfHasName", names: ["Eater Adam"] },
              optional: true,
              target: {
                count: 1,
                filter: { controller: "mine", kind: ["Digimon"] },
              },
            },
          ],
        },
      ],
    });
    expect((inherited?.actions[0] as any).actions[0].target.filter.nameOrTrait).toEqual([
      { tokens: ["Unidentified", "CS"], match: "trait" },
    ]);
  });

  it("plays the checked physical Tamer from security without paying memory", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT22-091", as: "arata", faceUp: true }] } });
    const arataId = s.inst("arata").instanceId;
    const memory = s.state.memory;

    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: { sourceInstanceId: string }): Promise<void>;
      }
    ).fireTiming(EffectTiming.SecuritySkill, { sourceInstanceId: arataId });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === arataId));

    expect(s.state.memory).toBe(memory);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === arataId)).toBe(true);
  });
});
