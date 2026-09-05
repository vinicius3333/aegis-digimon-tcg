import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-020.js";

describe("EX6-020 Gatomon", () => {
  it("reveals three for Angel-family/Fallen Angel and Mirei Mikagura cards on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { count: 1, to: "hand" },
          { count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      });
    }
  });
  it("inherits once-per-turn -2000 DP on attack", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    }));

  it("adds one Angel-family card and exact Mirei Mikagura from the revealed top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-020", as: "gato" }],
          deck: ["EX6-019", "EX6-074", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gato").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX6-074"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX6-019", "EX6-074"]));
  });

  it("reduces an opposing Digimon by 2000 through its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-020"] }] },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
  });

  it("publicly resolves the same Angel and exact Mirei buckets when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-020", as: "gato" }], deck: ["EX6-019", "EX6-074", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gato"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX6-074"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX6-019", "EX6-074"]));
  });

  it("publicly digivolves from a purple level-3 Digimon and resolves its effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-045", as: "base" }],
          hand: [{ card: "EX6-020", as: "gato" }],
          deck: ["EX6-019", "EX6-074", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gato").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX6-020" &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX6-074"),
    );
    expect(s.perm("base").topCard?.cardId).toBe("EX6-020");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("EX6-045");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX6-019", "EX6-074"]));
    expect(s.state.memory).toBe(3);
  });
});
