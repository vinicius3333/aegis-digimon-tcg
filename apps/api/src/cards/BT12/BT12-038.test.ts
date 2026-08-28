import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-038.js";

describe("BT12-038 GeoGreymon", () => {
  it("requires both Agumon in name and Dinosaur trait for its 2-cost route", () => {
    expect(digivolutionRequirementsFor("BT12-038")).toContainEqual({
      level: 3,
      names: ["Agumon"],
      traits: ["Dinosaur"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("evolves from the qualifying Agumon and may free-play Marcus when none is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-034", as: "agumon" }],
          hand: [
            { card: "BT12-038", as: "geo" },
            { card: "BT12-092", as: "marcus" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-092"));
    expect(s.state.memory).toBe(3);
    expect(s.perm("agumon").stack.map(({ cardId }) => cardId)).toContain("BT12-034");
  });

  it("does not apply the special cost to an Agumon without Dinosaur", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "agumon" }],
        hand: [{ card: "BT12-038", as: "geo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT12-038");
    expect(s.state.memory).toBe(2);
  });

  it("does not play another Marcus and its inherited Tamer watcher resolves once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-038", as: "geo", under: ["BT12-038"] },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-095", as: "otherMarcus" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    await advance(s.engine).verb.unsuspend([s.perm("marcus").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("otherMarcus").instanceId);
  });
});
