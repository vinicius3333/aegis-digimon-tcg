import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-064.js";
import "../index.js";

describe("EX5-064 Koh & Sayo", () => {
  it("sets memory to 3 at the start of your turn when memory is 2 or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
  });
  it("offers free evolution from hand with the compound suspend and Light Fang/Night Claw cost", () => {
    for (const trigger of ["OnPlay", "Main"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
        into: { controllerDefault: "mine", kind: ["Digimon"] },
        cost: {
          kind: "compound",
          costs: [
            { kind: "suspend", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
            {
              kind: "placeOwnTopAtStackBottom",
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
                },
              },
            },
          ],
        },
      });
    }
  });
  it("plays itself for free from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });

  it("sets memory to 3 at Start of Your Turn only at the two-memory boundary", async () => {
    const resolve = async (memory: number) => {
      const s = setupEngine({ 0: { battleArea: [{ card: "EX5-064", as: "tamer" }] } });
      s.state.memory = memory;
      await s.ready();
      await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("tamer"));
      await settle();
      return s.state.memory;
    };
    expect(await resolve(2)).toBe(3);
    expect(await resolve(3)).toBe(3);
  });

  it("plays a free evolution after suspending and bottom-placing a Night Claw top card", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-017", as: "placementHost", under: ["BT1-009"] },
            { card: "BT1-019", as: "evoBase" },
          ],
          hand: [
            { card: "EX5-064", as: "tamer" },
            { card: "EX5-020", as: "evolving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.perm("evoBase").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("evoBase").topCard?.cardId === "EX5-020");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("placementHost").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("placementHost").stack.map((card) => card.cardId)).toEqual(["EX5-017"]);
    expect(s.perm("evoBase").topCard?.cardId).toBe("EX5-020");
    expect(s.state.memory).toBe(6);
  });

  it("does not use a non-Light-Fang/Night-Claw Digimon for the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [
            { card: "EX5-064", as: "tamer" },
            { card: "EX5-017", as: "evolving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-017")).toBe(true);
  });

  it("plays itself from the public Security timing", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX5-064", as: "source" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-064"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-064")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX5-064")).toBe(false);
  });
});
