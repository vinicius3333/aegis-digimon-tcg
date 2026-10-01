import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../BT3/BT3-017.js";
import "./ST9-07.js";

describe("ST9-07 KoKabuterimon", () => {
  it("has Blocker on the opponent turn while you have a blue Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-07", as: "kokabu" }, "ST9-02"] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kokabu"), "Blocker")).toBe(true);
  });

  it("loses Blocker before reaction timing when the only blue Digimon is deleted while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-017", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST9-02", as: "blue" },
            { card: "ST9-07", as: "kokabu" },
          ],
          security: ["ST9-02"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const bluePermanentId = s.perm("blue").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("kokabu"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 3000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === bluePermanentId)).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("kokabu"), "Blocker")).toBe(false);
    expect(s.perm("kokabu").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("ST9-07 KoKabuterimon — KB Q&A rulings", () => {
  async function attackWithValkyrimon(defenderBattleArea: PermanentSpec[]) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-017", as: "attacker" }] },
        1: { battleArea: defenderBattleArea, security: ["ST9-02", "ST9-02"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("blue").topCard!.instanceId);
    await s.ready();
    const bluePermanentId = s.perm("blue").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("kokabu"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "blockWindowOpened") || s.state.players[1]!.security.length < 2,
      3000,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === bluePermanentId)).toBe(false);
    return s;
  }

  function blockWindowsOffering(s: EngineSetup, permanentId: string) {
    return s.events.filter(
      (event) => event.kind === "blockWindowOpened" && event.eligibleBlockerIds.includes(permanentId),
    );
  }

  it("cannot block after a [When Attacking] effect deletes the only blue Digimon (Q711)", async () => {
    const s = await attackWithValkyrimon([
      { card: "ST9-02", as: "blue" },
      { card: "ST9-07", as: "kokabu" },
    ]);

    expect(blockWindowsOffering(s, s.perm("kokabu").permanentId)).toHaveLength(0);
    expect(s.perm("kokabu").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);

    const control = await attackWithValkyrimon([
      { card: "ST9-02", as: "blue" },
      { card: "ST9-05", as: "survivingBlue" },
      { card: "ST9-07", as: "kokabu" },
    ]);
    const kokabuId = control.perm("kokabu").permanentId;
    expect(blockWindowsOffering(control, kokabuId)).toHaveLength(1);
    expect(control.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: kokabuId })).toEqual({ ok: true });
    await settle(() => control.events.some((event) => event.kind === "blocked"), 3000);
    expect(control.events).toContainEqual(expect.objectContaining({ kind: "blocked", blockerPermanentId: kokabuId }));
    expect(control.state.players[1]!.security).toHaveLength(2);
  });
});
