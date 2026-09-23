import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT11-107.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("BT11-107 Hades Force", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-107")).toMatchObject({
      cardId: "BT11-107",
      colors: ["Black", "Red"],
      kinds: ["Option"],
      playCost: 7,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            actions: [{ condition: { filter: { digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"] }] } } }],
          },
        ],
      },
      { trigger: "Main", actions: [{ kind: "SelectBind" }, { kind: "Delete" }, { kind: "Attack" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "Delete" }] },
    ]);
  });

  it("deletes opponent Digimon and Tamers within the selected Greymon's play-cost budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-064", under: ["BT9-109"], as: "greymon" }],
          hand: [{ card: "BT11-107", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "ST1-02", as: "digimon" },
            { card: "BT1-088", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.perm("greymon").stack).toHaveLength(1);
    expect(s.perm("greymon").stack[0]!.cardId).toBe("BT9-109");
    expect(getCardDefinition("BT11-107")!.playCost).toBe(7);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 400);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("registers the complete IR", () => {
    const compiled = runtimeCompiledCard("BT11-107")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "SelectBind",
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
});

describe("BT11-107 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT11-107")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});
