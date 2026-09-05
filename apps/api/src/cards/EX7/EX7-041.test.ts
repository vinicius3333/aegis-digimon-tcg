import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-041.js";
import "../index.js";

describe("EX7-041", () => {
  it("has Blocker and protects itself from effect deletion during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "protection",
      tokens: ["beDeletedByEffects"],
    });
  });
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));

  it("uses Blocker publicly and protects from an opponent effect during their turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-041", as: "torto" }] },
      1: { battleArea: [{ card: "BT1-009", as: "other" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("torto"), "Blocker")).toBe(true);
    const removed = await advance(s.engine).verb.deletePermanent([s.perm("torto").permanentId], "byEffect");
    expect(removed).toBe(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX7-041")).toBe(true);
  });

  it("unsuspends only the inherited Reboot host during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-064", as: "host", under: ["EX7-041"] },
          { card: "BT10-064", as: "ordinary" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId, s.perm("ordinary").permanentId]);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("ordinary").isSuspended).toBe(true);
  });

  it("is still deleted by rule processing at zero or lower DP during the opponent's turn (Q3851)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-041", as: "torto" }] },
        1: {
          hand: [
            { card: "EX7-026", as: "first" },
            { card: "EX7-026", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = 10;
    const tortoId = s.perm("torto").permanentId;
    const cardId = s.perm("torto").topCard!.instanceId;
    expect(await advance(s.engine).verb.deletePermanent([tortoId], "byEffect")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("torto").currentDP === 1000);
    expect(s.perm("torto").currentDP).toBe(1000);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(cardId);
  });
});
