import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST9/ST9-13.js";
import "./ST10-09.js";

describe("ST10-09 Witchmon", () => {
  it("returns a purple level 5 or lower Digimon from trash on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST10-09", as: "witchmon" }], trash: [{ card: "ST10-11", as: "returned" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId));
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not return a purple level 6 Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST10-09", as: "witchmon" }], trash: [{ card: "ST10-06", as: "tooLarge" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST10-09"),
    );
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("tooLarge").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("tooLarge").instanceId)).toBe(false);
  });

  it("plays after its security battle and resolves On Play during a multi-check attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST9-13", as: "attacker" }] },
        1: {
          security: ["ST10-02", { card: "ST10-09", as: "witchmon" }],
          trash: [{ card: "ST10-11", as: "returned" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const witchmonInstanceId = s.inst("witchmon").instanceId;
    const returnedInstanceId = s.inst("returned").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === witchmonInstanceId) &&
        s.state.players[1]!.hand.some((c) => c.instanceId === returnedInstanceId),
      3000,
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === witchmonInstanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((c) => c.instanceId === returnedInstanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

type SecuritySpec = string | { card: string; as: string };

function attackIntoWitchmonSecurity(security: SecuritySpec[]) {
  return setupEngine(
    {
      0: { battleArea: [{ card: "ST9-13", as: "attacker" }] },
      1: { security, trash: [{ card: "ST10-11", as: "returned" }] },
    },
    { autoOrderTriggers: true, autoSelectCards: true },
  );
}

describe("ST10-09 Witchmon — KB Q&A rulings", () => {
  it("plays itself at the end of the battle even after losing the security battle (Q741)", async () => {
    const s = attackIntoWitchmonSecurity([{ card: "ST10-09", as: "witchmon" }]);
    await s.ready();
    const witchmonInstanceId = s.inst("witchmon").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    const check = s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "ST10-09");
    expect(check?.kind === "securityChecked" ? check.battle : undefined).toMatchObject({
      attackerDeleted: false,
      securityDigimonDeleted: true,
    });
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === witchmonInstanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === witchmonInstanceId)).toBe(false);
  });

  it("activates its [On Play] effect when played by its [Security] effect (Q742)", async () => {
    const s = attackIntoWitchmonSecurity([{ card: "ST10-09", as: "witchmon" }]);
    await s.ready();
    const returnedInstanceId = s.inst("returned").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("witchmon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([returnedInstanceId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === returnedInstanceId)).toBe(false);
  });

  it("is played and resolves [On Play] after its battle and before the next security check (Q743)", async () => {
    const s = attackIntoWitchmonSecurity([{ card: "ST10-09", as: "witchmon" }, "ST10-02"]);
    await s.ready();
    const witchmonInstanceId = s.inst("witchmon").instanceId;
    const returnedInstanceId = s.inst("returned").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);
    expect(s.state.players[1]!.security).toHaveLength(0);

    const witchmonCheckIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "ST10-09",
    );
    const playIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(witchmonInstanceId),
    );
    const returnIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "hand" && event.instanceIds.includes(returnedInstanceId),
    );
    const nextRevealIndex = s.events.findIndex(
      (event) => event.kind === "securityRevealed" && event.revealedCardId === "ST10-02",
    );
    expect(witchmonCheckIndex).toBeGreaterThanOrEqual(0);
    expect(playIndex).toBeGreaterThan(witchmonCheckIndex);
    expect(returnIndex).toBeGreaterThan(playIndex);
    expect(nextRevealIndex).toBeGreaterThan(returnIndex);
  });
});
