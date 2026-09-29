import { describe, expect, it } from "vitest";
import { makeInstance as instance, drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-091.js";
import "./BT8-079.js";
import { advance } from "../../engine/testkit/advance.js";

describe("BT8-079 SkullSatamon", () => {
  it("mills 2, then returns a Demon Lord from trash to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "base" }],
          hand: [{ card: "BT8-079", as: "evolving" }],
          trash: [{ card: "BT1-009", as: "nonDemonLord" }],
          deck: ["BT1-009", { card: "BT2-111", as: "demonLord" }, "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const mine = s.state.players[0]!;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-079"));
    expect(mine.hand.some((card) => card.instanceId === s.inst("demonLord").instanceId)).toBe(true);
    expect(mine.trash).toHaveLength(2);
    expect(mine.trash.some((card) => card.instanceId === s.inst("nonDemonLord").instanceId)).toBe(true);
  });

  it("inherits once-per-turn memory when its deck is trashed", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-074", as: "host" }] } });
    s.state.turnSeat = 0;
    const host = s.perm("host");
    host.stack.push(instance("BT8-079", 0, true));
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: {
        instanceIds: [instance("BT1-009", 0, false).instanceId],
        byEffect: { ownerSeat: 0, isDigimonEffect: false },
      },
    });
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: {
        instanceIds: [instance("BT1-010", 0, false).instanceId],
        byEffect: { ownerSeat: 0, isDigimonEffect: false },
      },
    });
    expect(s.state.memory).toBe(1);
  });
});

describe("BT8-079 SkullSatamon — KB Q&A rulings", () => {
  it("does not gain memory when a reveal effect trashes the remaining revealed cards (Q1760)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-076", as: "host", under: ["BT8-079"] }],
          hand: [
            { card: "BT9-091", as: "revealTamer" },
            { card: "BT8-079", as: "miller" },
          ],
          deck: [
            { card: "BT8-034", as: "addedToHand" },
            { card: "BT1-009", as: "revealedRest1" },
            { card: "BT1-010", as: "revealedRest2" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const mine = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => mine.trash.length === 2);
    await drainMicrotasks();
    expect(mine.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("revealedRest1").instanceId, s.inst("revealedRest2").instanceId]),
    );
    expect(mine.hand.some((card) => card.instanceId === s.inst("addedToHand").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("miller").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => mine.trash.length === 4);
    expect(s.state.memory).toBe(3);
  });
});
