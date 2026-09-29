import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT7/BT7-063.js";
import "./BT8-062.js";

describe("BT8-062 SkullKnightmon Cavalier Mode", () => {
  it("gains Jamming and Blocker through the opponent's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-058", as: "base" }],
        hand: [{ card: "BT8-062", as: "evolving" }],
        deck: ["BT8-060", "BT8-060"],
      },
      1: { deck: ["BT8-060", "BT8-060"] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-062"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
  });

  it("is treated as both SkullKnightmon and DeadlyAxemon by rule", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-062", as: "cavalier" }] } });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("cavalier"))).toEqual(
      expect.arrayContaining(["skullknightmon cavalier mode", "skullknightmon", "deadlyaxemon"]),
    );
  });
});

describe("BT8-062 SkullKnightmon Cavalier Mode — KB Q&A rulings", () => {
  it("is always treated as both [SkullKnightmon] and [DeadlyAxemon], filling both of DarkKnightmon's named slots (Q1745)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-063", as: "darkKnightmon" }],
          trash: [
            { card: "BT8-062", as: "cavalierOne" },
            { card: "BT8-062", as: "cavalierTwo" },
            { card: "BT8-060", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    const darkKnightmon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("darkKnightmon").instanceId,
    )!;
    expect(darkKnightmon.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cavalierOne").instanceId, s.inst("cavalierTwo").instanceId]),
    );
    expect(darkKnightmon.stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("unrelated").instanceId]);
  });
});
