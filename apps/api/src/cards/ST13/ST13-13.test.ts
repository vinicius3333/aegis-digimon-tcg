import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-13.js";
import "./ST13-15.js";

describe("ST13-13 RaijiLudomon", () => {
  it("survives an opponent's deletion effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST13-13", as: "raiji", suspended: true }] },
      1: { battleArea: ["ST13-05"], hand: [{ card: "ST13-15", as: "smasher" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("smasher").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raiji").permanentId)).toBe(true);
  });

  it("can still be deleted in battle on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST13-13", as: "raiji", suspended: true }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("raiji").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST13-13")).toBe(true);
  });

  it("DNA digivolves its inherited host with the required partner at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-14", as: "black-material", under: ["ST13-13"] },
            { card: "ST13-05", as: "red-material" },
          ],
          hand: [{ card: "ST13-06", as: "ragna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("black-material"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-06"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("ST13-06");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST13-05", "ST13-13", "ST13-14"]),
    );
  });

  it("cannot use the inherited effect for a card without a DNA requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-14", as: "host", under: ["ST13-13"] },
            { card: "ST13-05", as: "partner" },
          ],
          hand: [{ card: "BT1-025", as: "non-dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("non-dna").instanceId)).toBe(true);
  });
});
