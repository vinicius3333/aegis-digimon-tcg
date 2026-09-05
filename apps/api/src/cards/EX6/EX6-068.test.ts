import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-068.js";

describe("EX6-068 Descent of the Three Great Angels", () => {
  it("contains security placement, Delay search, and Security permanent IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("placeAsSecurity");
    expect(text).toContain("Three Great Angels");
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(text).toContain("onDeletionOf");
  });
  it("publicly places an Angel at security bottom before placing the Option in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-055", as: "source" }],
          hand: [
            { card: "EX6-068", as: "option" },
            { card: "BT1-053", as: "angel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068")).toBe(true);
  });
  it("publicly still places itself when the optional security placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-055", as: "source" }],
          hand: [
            { card: "EX6-068", as: "option" },
            { card: "BT1-053", as: "angel" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068")).toBe(true);
  });

  it("publicly places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX6-068", as: "option", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068")).toBe(true);
  });

  it("arms Delay on a deleted Angel and plays a Three Great Angels card from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-053", as: "angel" }],
          hand: [{ card: "EX6-068", as: "option" }],
          security: [{ card: "BT1-063", as: "seraph" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).verb.deletePermanent([s.perm("angel").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-063"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-063")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
