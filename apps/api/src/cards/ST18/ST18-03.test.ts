import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "../BT21/BT21-050.js";

describe("ST18-03 Falcomon", () => {
  it("suspends an opponent Digimon when it attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-03", as: "attacker" }] },
        1: { battleArea: [{ card: "ST18-03", as: "victim" }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended);

    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("resolves safely when the opponent has no Digimon target", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-03", as: "attacker" }] }, 1: { security: ["BT1-011"] } });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("ST18-03 Falcomon — KB Q&A rulings", () => {
  it("lets the opponent's Cherrymon use its [Opponent's Turn] redirect after this attack suspends it (Q4555)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-050", as: "cherrymon" }],
          security: ["BT1-009", "BT1-001"],
        },
        1: { battleArea: [{ card: "ST18-03", as: "falcomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const cherrymonId = s.perm("cherrymon").permanentId;
    preferInstanceIds.push(s.perm("cherrymon").topCard!.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(s.perm("cherrymon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("falcomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === cherrymonId)?.isSuspended).toBe(
      true,
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        target: { kind: "permanent", permanentId: cherrymonId },
      }),
    );
    expect(s.state.players[0]!.security).toHaveLength(2);

    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-050", as: "cherrymon" }],
          security: ["BT1-009", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-020", as: "plainAttacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.turnSeat = 1;
    control.state.memory = 0;
    await control.ready();
    expect(
      control.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: control.perm("plainAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => control.state.players[0]!.security.length === 1 && !observe(control.engine).isAttacking());
    expect(control.perm("cherrymon").isSuspended).toBe(false);
    expect(control.state.players[0]!.security).toHaveLength(1);
  });
});
