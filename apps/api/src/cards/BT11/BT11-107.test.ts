import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT11-107.js";

describe("BT11-107 Hades Force", () => {
  it("deletes opponent Digimon and Tamers within the selected Greymon's play-cost budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-064", under: ["BT11-064"], as: "greymon" }],
          hand: [{ card: "BT11-107", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "ST1-02", as: "digimon" }, // play cost 2
            { card: "BT1-088", as: "tamer" }, // play cost 2
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.perm("greymon").stack).toHaveLength(1);
    expect(s.perm("greymon").stack[0]!.cardId).toBe("BT11-064");
    expect(getCardDefinition("BT11-107")!.playCost).toBe(7);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 400);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(5); // the X Antibody reduction lowers Hades Force from 7 to 5
  });

  it("registers the complete IR", () => {
    const compiled = runtimeCompiledCard("BT11-107")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({ kind: "SelectBind" });
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
});
