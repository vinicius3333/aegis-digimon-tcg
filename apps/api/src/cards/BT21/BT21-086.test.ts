import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT21-086.js";
import { compiled } from "./BT21-086.js";

describe("BT21-086 Marcus Damon", () => {
  it("registers the three printed timing windows and a real On Play suspension effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend" });
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "GainMemory" });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn" });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("suspends a Marcus Damon on the field when played", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [{ card: "BT21-086", as: "existingMarcus" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => setup.perm("existingMarcus").isSuspended, 200);

    expect(setup.perm("existingMarcus").isSuspended).toBe(true);
  });
});
