import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-067.js";

describe("BT12-067 Betsumon", () => {
  it("digivolves for 3 from a level-4 Digimon with Save text", async () => {
    expect(digivolutionRequirementsFor("BT12-067")).toContainEqual({
      level: 4,
      texts: ["Save"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-064", as: "saveBase" }],
        hand: [{ card: "BT12-067", as: "betsumon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("saveBase").permanentId,
        instanceId: s.inst("betsumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("saveBase").topCard.cardId === "BT12-067");
    expect(s.state.memory).toBe(0);
    expect(s.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-064"]);
  });

  it("rejects a level-4 Digimon without Save text", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "plainBase" }], hand: [{ card: "BT12-067", as: "betsumon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainBase").permanentId,
        instanceId: s.inst("betsumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives its host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-067"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
