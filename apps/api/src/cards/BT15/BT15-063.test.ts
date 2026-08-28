import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-063.js";

describe("BT15-063", () => {
  it("retains inherited Blocker", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("may digivolve itself into a Beast Dragon/DigiPolice from hand when a DigiPolice Tamer is stacked", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              optional: true,
              condition: { kind: "selfDigivolutionStackHasTrait" },
            },
          ],
        },
      ],
    }));
  it("once per turn unsuspends a Beast Dragon/DigiPolice when an effect suspends", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] },
          actions: [{ kind: "Unsuspend" }],
        },
      ],
    }));

  it("reacts to a natural effect suspension of another permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-063", as: "host", under: ["BT15-058"] },
            { card: "BT15-058", as: "ally", suspended: true },
          ],
          hand: [{ card: "BT14-043", as: "koDokugumon" }],
        },
        1: { battleArea: [{ card: "BT14-042", as: "opposingTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koDokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opposingTarget").isSuspended && s.perm("ally").isSuspended === false);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("opposingTarget").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
  });
});
