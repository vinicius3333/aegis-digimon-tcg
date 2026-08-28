import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-089.js";
import "./index.js";

describe("BT17-089 Rhythm", () => {
  it("provides both suspension-triggered Your Turn effects", () => {
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "SubTrigger", event: "whenEffectSuspends" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    const suspensionTrigger = compiled.effects?.[1]?.actions[0] as any;
    expect(suspensionTrigger?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(suspensionTrigger?.actions?.[1]).toMatchObject({
      kind: "Draw",
      condition: {
        kind: "youHave",
        filter: {
          orFilters: [
            {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }],
            },
          ],
        },
      },
    });
  });

  it("provides the Security play effect", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }],
    });
  });

  it("suspends after an effect suspends a Digimon, then gains memory and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-089", as: "rhythm" },
            { card: "BT17-045", as: "argomon" },
            { card: "BT17-043", as: "suspendedByEffect" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).verb.suspend([s.perm("suspendedByEffect").permanentId], 0);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
