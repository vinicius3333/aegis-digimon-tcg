import { digiXrosRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-011.js";
import "../ST7/ST7-06.js";

describe("BT12-011 Shoutmon (King Version)", () => {
  it("may play exactly one of the three named Tamers on public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT12-011", as: "king" },
            { card: "BT12-087", as: "taiki" },
            { card: "BT12-094", as: "yuu" },
            { card: "BT12-096", as: "tagiru" },
            { card: "BT12-089", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const playedIds = s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId);
    expect(playedIds.filter((id) => ["BT12-087", "BT12-094", "BT12-096"].includes(id))).toHaveLength(1);
    expect(playedIds).not.toContain("BT12-089");
    expect(s.state.memory).toBe(5);
  });

  it("can decline the named Tamer play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT12-011", as: "king" }, { card: "BT12-087", as: "taiki" }] } },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("taiki").instanceId);
  });

  it("uses the Save-text alternate evolution and plays a named Tamer on digivolution", async () => {
    expect(digivolutionRequirementsFor("BT12-011")).toContainEqual(
      expect.objectContaining({ level: 3, texts: ["Save"], cost: 2, isAlternate: true }),
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-058", as: "base" }],
          hand: [{ card: "BT12-011", as: "king" }, { card: "BT12-094", as: "yuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-094"));
    expect(s.perm("base").topCard.cardId).toBe("BT12-011");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT12-058");
    expect(s.state.memory).toBe(8);
  });

  it("rejects alternate evolution from a non-red level 3 without Save text", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-020", as: "base" }], hand: [{ card: "BT12-011", as: "king" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses one Save material for DigiXros -2", async () => {
    expect(digiXrosRequirementFor("BT12-011")).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
    const s = setupEngine({
      0: { hand: [{ card: "BT12-011", as: "king" }, { card: "BT12-008", as: "material" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("king").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toContain(
      s.inst("material").instanceId,
    );
    expect(s.state.memory).toBe(7);
  });

  it("Saves itself, then places another Save Digimon from trash under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-011", as: "king" }, { card: "BT12-094", as: "tamer" }],
          trash: [{ card: "BT12-008", as: "savedPeer" }],
        },
        1: { hand: [{ card: "ST7-06", as: "removal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kingId = s.perm("king").topCard.instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId).sort()).toEqual(
      [kingId, s.inst("savedPeer").instanceId].sort(),
    );
  });

  it("deletes only a 4000 DP opponent through its inherited public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-011"] }], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT12-021", dp: 4000 }, { card: "BT12-021", as: "tooLarge", dp: 5000 }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("tooLarge").permanentId);
  });
});
