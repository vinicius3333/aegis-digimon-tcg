import { type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe.each([0, 1] as const)("GitHub #5350 promotion sweep: holder seat %s", (holder) => {
  const attacker: Seat = holder === 0 ? 1 : 0;
  it.each(["BT8-038", "BT9-044"])("%s retains a promoted Digi-Egg that has printed DP", async (card) => {
    const s = setupEngine(
      {
        [holder]: { battleArea: [{ card, as: "host", under: ["EX2-007"], suspended: true }] },
        [attacker]: { battleArea: [{ card: "EX9-021", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = attacker;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(attacker, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();
    expect(s.state.players[holder]!.battleArea).toHaveLength(1);
    expect(s.perm("host").topCard.cardId).toBe("EX2-007");
    expect(s.perm("host").currentDP).toBe(15000);
  });

  it.each([
    { card: "BT8-038", mechanism: "Armor Purge" },
    { card: "BT9-044", mechanism: "place top in security" },
  ])("$mechanism rule-trashes a promoted no-DP egg without inherited On Deletion", async ({ card }) => {
    const s = setupEngine(
      {
        [holder]: { battleArea: [{ card, as: "host", under: ["BT7-091", "BT26-001"], suspended: true }] },
        [attacker]: { battleArea: [{ card: "EX9-021", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = attacker;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(attacker, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.players[holder]!.battleArea.length === 0);
    expect(s.state.memory).toBe(10);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT7-091")).toBe(false);
  });
});
