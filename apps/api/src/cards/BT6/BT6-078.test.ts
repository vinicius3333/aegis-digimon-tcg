import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-078.js";

describe("BT6-078 SkullGreymon", () => {
  it("may place itself under a purple Digimon when trashed from hand by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT6-068",
          as: "purple",
          under: [{ card: "BT1-001", as: "existingSource" }],
        }],
        hand: [{ card: "BT6-078", as: "skullgreymon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).verb.trash([s.inst("skullgreymon").instanceId]);
    await settle(() => s.perm("purple").stack.some((card) => card.instanceId === s.inst("skullgreymon").instanceId));

    expect(s.perm("purple").stack.map((card) => card.instanceId)).toEqual([
      s.inst("skullgreymon").instanceId,
      s.inst("existingSource").instanceId,
    ]);
  });

  it("trashes a hand card for +3000 DP when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-078", as: "host" }], hand: [{ card: "BT1-011", as: "cost" }] }, 1: { security: ["BT1-101"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const startingDP = s.perm("host").currentDP;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
      s.perm("host").currentDP === startingDP + 3000 &&
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("host").currentDP).toBe(startingDP + 3000);
  });

  it("grants Retaliation to its host as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT6-078"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});
