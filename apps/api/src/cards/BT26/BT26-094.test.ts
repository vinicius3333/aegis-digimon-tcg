import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-094.js";
import "../index.js";

describe("BT26-094 compiled behavior", () => {
  it("maps Keenan's placement, both Your Turn watchers, and Security clause", () => {
    expect(getCardDefinition("BT26-094")).toMatchObject({
      nameEn: "Keenan Crier",
      colors: ["Purple"],
      kinds: ["Tamer"],
      types: ["DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenHandTrashed" }),
        expect.objectContaining({ event: "whenDigivolutionTrashed" }),
      ]),
    );
  });

  it("publicly places DATA SQUAD, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-094", as: "keenan" }],
          hand: [{ card: "P-235", as: "dataSquad" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("keenan").stack).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains Execute as the shared result of both public watcher clauses", () => {
    const actions = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actions: [expect.objectContaining({ kind: "CostGatedBlock" })] }),
      ]),
    );
  });
});
