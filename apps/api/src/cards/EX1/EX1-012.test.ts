import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-012.js";

describe("EX1-012 Gomamon", () => {
  it("trashes the bottom digivolution card of an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-012", as: "gomamon" }] },
        1: {
          battleArea: [
            {
              card: "BT1-032",
              as: "target",
              under: [
                { card: "BT1-029", as: "bottom" },
                { card: "BT1-030", as: "topSource" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.instanceId).toBe(s.inst("topSource").instanceId);
  });

  it("does not select an opposing Digimon with no digivolution cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX1-012", as: "gomamon" }] }, 1: { battleArea: [{ card: "BT1-030", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-012"));
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("does not target a stacked Digimon in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-012", as: "gomamon" }],
          battleArea: [{ card: "BT1-032", as: "ownTarget", under: ["BT1-029"] }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-032",
              as: "battleTarget",
              under: [{ card: "BT1-029", as: "battleBottom" }, "BT1-030"],
            },
          ],
          breeding: { card: "BT1-032", as: "raised", under: ["BT1-030"] },
        },
      },
      { autoSelectCards: true },
    );
    const battleBottomId = s.inst("battleBottom").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-012"));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === battleBottomId)).toBe(true);
    expect(s.perm("battleTarget").stack).toHaveLength(1);
    expect(s.perm("raised").stack).toHaveLength(1);
    expect(s.perm("ownTarget").stack).toHaveLength(1);
  });

  it("evolves from a legal blue level-2 source without firing its On Play effect", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "EX1-012", as: "gomamon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-032", as: "target", under: ["BT1-029"] }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-012");

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-003"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects evolution from a non-blue level-2 source without changing the stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "base" },
        hand: [{ card: "EX1-012", as: "gomamon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    await settle();

    expect(s.perm("base").topCard.cardId).toBe("BT1-001");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-012"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
