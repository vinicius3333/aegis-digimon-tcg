import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-095.js";
import "../index.js";

describe("BT26-095 compiled behavior", () => {
  it("maps Makoto's placement, deletion reaction, and Security clause", () => {
    expect(getCardDefinition("BT26-095")).toMatchObject({
      nameEn: "Makoto Kuonji",
      colors: ["Purple"],
      kinds: ["Tamer"],
      types: ["Glowing Dawn", "BEATBREAK"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
    });
  });

  it("publicly places BEATBREAK, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-095", as: "makoto" }],
          hand: [{ card: "P-236", as: "beatbreak" }],
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
    expect(s.perm("makoto").stack).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains the ordered Draw, hand trash, and non-Digi-Egg placement body", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(action).toMatchObject({
      actions: [
        {
          kind: "CostGatedBlock",
          actions: [{ kind: "Draw" }, { kind: "Trash" }, { kind: "PlaceUnder", faceDown: true }],
        },
      ],
    });
  });
});
