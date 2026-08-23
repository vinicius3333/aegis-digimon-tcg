import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-086.js";

describe("BT6-086 Eosmon", () => {
  it("places Eosmon from trash for each Tamer and deletes after placing at least 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-085", as: "base" },
            { card: "BT6-087", as: "tai" },
            { card: "BT6-088", as: "matt" },
          ],
          hand: [{ card: "BT6-086", as: "evolving" }],
          trash: [
            { card: "BT6-085", as: "first" },
            { card: "BT6-085", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT6-075", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId, s.perm("target").permanentId);
    const targetInstanceId = s.perm("target").topCard.instanceId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("gains Security Attack +1 for every 3 digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-086", under: ["BT6-085", "BT6-085", "BT6-085", "BT6-085", "BT6-085", "BT6-085"], as: "eosmon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("eosmon"), "SecurityAttack")).toBe(2);
  });
});
