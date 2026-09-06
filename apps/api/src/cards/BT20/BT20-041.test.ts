import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-041.js";
import "./index.js";
import "../BT1/BT1-036.js";

describe("BT20-041 Crowmon", () => {
  it("suspends an opponent, buffs one of yours, and optionally attacks on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] } },
            amount: 3000,
            duration: "forTheTurn",
          },
          { kind: "Attack", optional: true },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("on play suspends the opponent, gains +3000 DP, and takes the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-010", dp: 6000, as: "attacker" }],
          hand: [{ card: "BT20-041", as: "crowmon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crowmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").isSuspended && s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(9000);
    expect(s.state.memory).toBe(4); // play cost 6 from a 10-memory gauge
  });

  it("publicly evolves from a level-4 ACCEL Digimon and resolves the When Digivolving clauses when attack is declined", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-039", as: "diatrymon" },
            { card: "BT20-010", dp: 5000, as: "buffTarget" },
          ],
          hand: [{ card: "BT20-041", as: "crowmon" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("buffTarget").permanentId, s.perm("opponent").permanentId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("diatrymon").permanentId,
        instanceId: s.inst("crowmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("diatrymon").topCard.cardId === "BT20-041" && s.state.pendingDecision === undefined);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("buffTarget").currentDP).toBe(8000);
    expect(s.perm("buffTarget").isSuspended).toBe(false);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-023", as: "blueOnly" }], hand: [{ card: "BT20-041", as: "crowmon" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("blueOnly").permanentId,
        instanceId: invalid.inst("crowmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("blueOnly").topCard.cardId).toBe("BT20-023");
  });

  it("inherits a once-per-turn -4000 DP When Attacking effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-043", dp: 7000, under: ["BT20-041"], as: "host" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT20-010")).toBe(true);
  });

  it("applies inherited -4000 once per turn, expires it, and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-043", dp: 7000, under: ["BT20-041"], as: "host" }],
          hand: [{ card: "BT1-036", as: "garurumon" }, "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 9000, as: "target" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // Attack the opponent directly so the inherited effect can target a surviving Digimon.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 && !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(5000);

    // A public BT1-036 play unsuspends the host for a second attack.  The second
    // inherited trigger is once-per-turn, so the target must remain at 5000,
    // rather than receiving another -4000 modifier.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[1]!.security).toHaveLength(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    // The for-the-turn modifier expires at the end of its controller's turn.
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(9000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    // On the next own turn, a new attack may use the once-per-turn trigger again.
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 3 && !observe(s.engine).isAttacking(),
    );
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[1]!.security).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
