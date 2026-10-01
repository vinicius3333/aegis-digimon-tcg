import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-03.js";
import "./ST14-10.js";
import "./ST14-11.js";

describe("ST14-10 Beelzemon: Blast Mode", () => {
  it("deletes with the dynamically raised level ceiling when trashed from deck", async () => {
    const s = setupEngine(
      {
        0: {
          trash: Array.from({ length: 9 }, () => "BT1-009"),
          hand: [{ card: "ST14-03", as: "miller" }],
          deck: [{ card: "ST14-10", as: "blast" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "level4" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("miller").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("unsuspends and gains 3 memory with 20 cards in trash when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-10", as: "blast", suspended: true }],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("blast"));
    expect(s.perm("blast").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
  });

  it("still unsuspends but does not gain memory below 20 trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-10", as: "blast", suspended: true }],
        trash: Array.from({ length: 19 }, () => "BT1-009"),
      },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("blast"));
    expect(s.perm("blast").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});

describe("ST14-10 Beelzemon: Blast Mode — KB Q&A rulings", () => {
  it("does not activate its trashed-from-deck effect when revealed or searched, only when trashed from the deck (Q802)", async () => {
    const revealed = setupEngine(
      {
        0: {
          hand: [{ card: "ST14-11", as: "revealer" }],
          deck: [{ card: "ST14-10", as: "blast" }, "BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "level3" }] },
      },
      { autoSelectCards: true, autoOrderCards: true, autoAcceptOptional: true },
    );
    revealed.state.memory = 10;
    expect(
      revealed.engine.applyIntent(0, { type: "playCard", instanceId: revealed.inst("revealer").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => revealed.state.players[0]!.deck.length === 3 && revealed.state.pendingDecision === undefined);
    await settle();
    expect(revealed.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("ST14-10");
    expect(revealed.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("ST14-10");
    expect(revealed.state.players[1]!.battleArea).toHaveLength(1);

    const milled = setupEngine(
      {
        0: {
          hand: [{ card: "ST14-03", as: "miller" }],
          deck: [{ card: "ST14-10", as: "blast" }, "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "level3" }] },
      },
      { autoSelectCards: true },
    );
    milled.state.memory = 10;
    expect(milled.engine.applyIntent(0, { type: "playCard", instanceId: milled.inst("miller").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => milled.state.players[1]!.battleArea.length === 0);
    expect(milled.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("ST14-10");
    expect(milled.state.players[1]!.battleArea).toHaveLength(0);
  });
});
