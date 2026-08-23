import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-040.js";
import "../index.js";

describe("BT16-040", () => {
  it("digivolves from trash into an Insectoid or Free level 4 at both timings", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }],
    });
  });

  it("suspends an opposing Digimon as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    });
  });

  it("digivolves the played Wormmon into a legal level 4 from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-040", as: "wormmon" }],
          trash: [{ card: "BT16-041", as: "stingmon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("wormmon").topCard?.cardId === "BT16-041");

    expect(s.perm("wormmon").topCard?.cardId).toBe("BT16-041");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-041")).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
