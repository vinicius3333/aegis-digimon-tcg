import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-079.js";
import "./BT10-083.js";

describe("BT10 Minervamon historical deck gauntlet", () => {
  it("checks the opposing board after retaliation and does not revive while three Digimon remain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-083", as: "minervamon", suspended: true }],
          trash: [{ card: "BT10-081", as: "baalmon" }],
        },
        1: {
          battleArea: [
            { card: "BT10-057", as: "attacker" },
            { card: "BT1-009", as: "bystanderA" },
            { card: "BT1-010", as: "bystanderB" },
            { card: "BT1-011", as: "bystanderC" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("minervamon"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("minervamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT10-083") &&
        s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT10-057") &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("baalmon").instanceId)).toBe(true);
  });

  it("revives without On Play, retaliates in battle, then replaces itself from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-083", as: "minervamon", suspended: true }],
          trash: [
            { card: "BT4-079", as: "labramon" },
            { card: "BT10-081", as: "baalmon" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT10-057", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlay" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("opponentPlay").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("labramon").instanceId),
    );

    // Labramon's On Play draw/discard is suppressed by Minervamon.
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("minervamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("baalmon").instanceId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT10-083")).toBe(true);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT10-057")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT10-081")).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-009")).toBe(true);
  });
});
