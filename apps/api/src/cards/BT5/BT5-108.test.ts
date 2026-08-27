import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-108.js";

describe("BT5-108 Earth Shaker", () => {
  it("deletes one unsuspended level 4 and one unsuspended level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT5-071", { card: "BT5-023", as: "ownLevel4" }],
          hand: [{ card: "BT5-108", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT5-023", as: "level4" },
            { card: "BT5-013", as: "level5" },
            { card: "BT5-024", as: "suspended4", suspended: true },
            { card: "BT5-013", as: "suspended5", suspended: true },
            { card: "BT5-071", as: "level3" },
            { card: "BT5-080", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 4);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([
        s.perm("suspended4").permanentId,
        s.perm("suspended5").permanentId,
        s.perm("level3").permanentId,
        s.perm("level6").permanentId,
      ]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-023")).toBe(true);
  });

  it("still activates when only one required level is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-071"], hand: [{ card: "BT5-108", as: "option" }] },
        1: { battleArea: [{ card: "BT5-023", as: "level4" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("still resolves when neither required level is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-071"], hand: [{ card: "BT5-108", as: "option" }] },
        1: { battleArea: [{ card: "BT5-071", as: "unmatched" }] },
      },
      { autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("unmatched")).toBeDefined();
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT5-108", as: "securityOption", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT5-023", as: "level4" },
            { card: "BT5-013", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
