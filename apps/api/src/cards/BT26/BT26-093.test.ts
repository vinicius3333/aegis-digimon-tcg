import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-093.js";
import "../index.js";

describe("BT26-093 compiled behavior", () => {
  it("maps Reina's placement, attack watcher, and Security clauses", () => {
    expect(getCardDefinition("BT26-093")).toMatchObject({
      nameEn: "Reina Sakuya",
      colors: ["Black"],
      kinds: ["Tamer"],
      types: ["Glowing Dawn", "BEATBREAK"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", faceDown: true },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
    });
  });

  it("publicly places a BEATBREAK card, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-093", as: "reina" }],
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
    expect(s.perm("reina").stack).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the attack grants together for one selected BEATBREAK Digimon", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(action).toMatchObject({
      actions: [
        {
          kind: "CostGatedBlock",
          actions: [
            { kind: "PlaceUnder" },
            { kind: "GainKeyword", keyword: { keyword: "Collision" }, keywords: [{ keyword: "Blocker" }] },
          ],
        },
      ],
    });
  });
});
