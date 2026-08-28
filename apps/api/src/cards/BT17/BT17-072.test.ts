import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-072.js";
import "./index.js";

describe("BT17-072 Ornismon", () => {
  it("deletes one opposing unsuspended Digimon on play and digivolving", () => {
    expect(compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))).toHaveLength(2);
    for (const effect of compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))) {
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("grants both continuous bonuses while another level-6 Digimon exists", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.actions).toEqual([
      expect.objectContaining({
        effect: { kind: "modifyDP", amount: 2000 },
        while: expect.objectContaining({
          kind: "youHave",
          filter: expect.objectContaining({ levels: [6], excludeSelf: true }),
        }),
      }),
      expect.objectContaining({
        effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }) },
        while: expect.objectContaining({
          kind: "youHave",
          filter: expect.objectContaining({ levels: [6], excludeSelf: true }),
        }),
      }),
    ]);
  });

  it("deletes only the unsuspended target when played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-063", as: "purpleSource" }], hand: [{ card: "BT17-072", as: "ornismon" }] },
        1: {
          battleArea: [
            { card: "BT17-063", as: "ready" },
            { card: "BT17-063", suspended: true, as: "suspended" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    const readyId = s.perm("ready").permanentId;
    const suspendedId = s.perm("suspended").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ornismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === readyId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === suspendedId)).toBe(true);
  });

  it("observes the DP and security-attack bonuses with another level 6", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-072", as: "ornismon" },
          { card: "BT17-071", as: "otherLevel6" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("ornismon").currentDP).toBe(15000);
    expect(observe(s.engine).hasKeyword(s.perm("ornismon"), "SecurityAttack")).toBe(true);
  });
});
