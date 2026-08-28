import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-006.js";

describe("BT15-006", () => {
  it("draws two after trashing a level 5 or higher Digimon from hand", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 2,
      optional: true,
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", levelComparison: { op: "gte", value: 5 } } } },
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      abortOnDecline: true,
      cost: { target: { filter: { controller: "mine", kind: ["Digimon"] } } },
    });
  });

  it("pays with exactly one level 5 Digimon and draws two when the inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-006"] }],
          hand: [
            { card: "BT10-012", as: "level5" },
            { card: "BT10-074", as: "level4" },
          ],
          deck: [
            { card: "BT1-001", as: "firstDraw" },
            { card: "BT1-002", as: "secondDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("level5").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level4").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(3);
  });

  it("draws through the natural attack deletion origin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 1000, suspended: true, under: ["BT15-006"] }],
          hand: [{ card: "BT10-012", as: "level5" }],
          deck: [
            { card: "BT1-001", as: "firstDraw" },
            { card: "BT1-002", as: "secondDraw" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("level5").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("draws nothing when the cost is declined or no level 5 Digimon is available", async () => {
    for (const autoAcceptOptional of [false, true]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-006"] }],
            hand: [{ card: autoAcceptOptional ? "BT10-074" : "BT10-012", as: "candidate" }],
            deck: [
              { card: "BT1-001", as: "firstDraw" },
              { card: "BT1-002", as: "secondDraw" },
            ],
          },
        },
        { autoAcceptOptional, autoSelectCards: true },
      );

      const hostId = s.perm("host").permanentId;
      void advance(s.engine).verb.deletePermanent([hostId]);
      await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));

      expect(s.state.players[0]!.deck).toHaveLength(2);
      expect(s.state.players[0]!.hand).toHaveLength(1);
    }
  });
});
