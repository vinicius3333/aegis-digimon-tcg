import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./index.js";
import { compiled } from "./BT20-001.js";

describe("BT20-001 DemiVeemon", () => {
  it("only grants +2000 DP to this inherited Digimon with 4 or more digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect?.trigger).toBe("YourTurn");
    expect(action).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
      condition: {
        kind: "selfDigivolutionCountAtLeast",
        value: 4,
      },
    });
    expect(irNode(action)?.target).toMatchObject({ count: 1, isSelf: true });
  });

  it("observably grants +2000 DP only on its controller's turn at the 4-card boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-010", as: "ally" }],
        breeding: { card: "BT20-001", as: "atBoundary" },
        deck: ["BT1-009"],
        hand: [
          { card: "BT20-008", as: "at3" },
          { card: "BT20-013", as: "at4" },
          { card: "BT20-014", as: "at5" },
          { card: "BT20-017", as: "at6" },
        ],
      },
      1: {
        // A legal four-card stack: Lv.2 egg -> Lv.3 -> Lv.4 -> Lv.5 under a Lv.6 top.
        // The non-DemiVeemon cards have no inherited DP effects, isolating this card's +2000.
        battleArea: [{ card: "BT1-025", as: "opponent", under: ["BT20-001", "BT1-009", "BT4-010", "BT1-020"] }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    for (const alias of ["at3", "at4", "at5", "at6"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("atBoundary").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("atBoundary").topCard.cardId === s.inst(alias).cardId);
    }
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("atBoundary").permanentId }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("atBoundary").currentDP).toBe(15000);
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP + 2000);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("atBoundary").currentDP).toBe(11000);
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP + 2000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const below = setupEngine({
      0: {
        breeding: { card: "BT20-001", as: "belowBoundary" },
        hand: [
          { card: "BT20-008", as: "below3" },
          { card: "BT20-013", as: "below4" },
          { card: "BT20-014", as: "below5" },
        ],
      },
    });
    below.state.memory = 10;
    for (const alias of ["below3", "below4", "below5"]) {
      expect(
        below.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: below.perm("belowBoundary").permanentId,
          instanceId: below.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => below.perm("belowBoundary").topCard.cardId === below.inst(alias).cardId);
    }
    const belowTurn = below.engine.runOneTurn();
    await settle(() => below.state.phase === Phase.Breeding);
    expect(
      below.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: below.perm("belowBoundary").permanentId }),
    ).toEqual({ ok: true });
    await advance(below.engine).waitForMainPhase(0);
    advance(below.engine).endMainPhaseIfOpen(0);
    await belowTurn;
    expect(below.perm("belowBoundary").currentDP).toBe(9000);
  });
});
