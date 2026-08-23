import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-061.js";
import "./index.js";

describe("BT17-061 Goblimon", () => {
  it("deletes one other Digimon as the cost to delete an opposing level-4-or-lower Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
      cost: {
        kind: "deleteOwn",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
      },
    });
  });

  it("has Retaliation as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Retaliation", raw: "＜Retaliation＞" },
    ]);
  });

  it("deletes another own Digimon to delete only the level-4 opponent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-061", as: "goblimon" }],
          battleArea: [{ card: "BT1-010", as: "costDigimon" }],
        },
        1: {
          battleArea: [
            { card: "BT4-025", as: "levelFour" },
            { card: "BT17-025", as: "levelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const costId = s.perm("costDigimon").permanentId;
    const levelFourId = s.perm("levelFour").permanentId;
    const levelFiveId = s.perm("levelFive").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFourId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFiveId)).toBe(true);
  });

  it("grants inherited Retaliation and deletes the winning battle opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-025", dp: 5000, under: ["BT17-061"], as: "host" }] },
      1: { battleArea: [{ card: "BT17-025", dp: 6000, suspended: true, as: "target" }] },
    });
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
  });
});
