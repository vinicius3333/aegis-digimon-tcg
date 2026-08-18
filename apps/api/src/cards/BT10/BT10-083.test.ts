import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-083.js";
import "../BT4/BT4-079.js";

describe("BT10-083 Minervamon", () => {
  it("plays a purple level 4 or lower from trash without activating its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-083", as: "minervamon" }],
          trash: [{ card: "BT4-079", as: "labramon" }],
          deck: ["BT1-001"],
        },
        1: { hand: [{ card: "BT1-010", as: "opponentPlay" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentPlay").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("labramon").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("plays a purple level 5 or lower from trash on deletion with at most 2 opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-083", as: "minervamon" }],
          trash: [{ card: "BT10-081", as: "baalmon" }],
        },
        1: { battleArea: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("minervamon").permanentId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("baalmon").instanceId)).toBe(true);
  });

  it("only observes an opposing Digimon, not your Digimon or an opposing Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-083", as: "minervamon" },
            { card: "BT1-010", as: "yourPlayedDigimon" },
          ],
          trash: [{ card: "BT4-079", as: "labramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-085", as: "opposingTamer" },
            { card: "BT1-011", as: "opposingDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("yourPlayedDigimon").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opposingTamer").permanentId,
    });
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("labramon").instanceId);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opposingDigimon").permanentId,
    });
    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("labramon").instanceId,
    )).toBe(true);
  });
});
