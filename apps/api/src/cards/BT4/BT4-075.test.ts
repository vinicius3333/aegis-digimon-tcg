import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-030.js";
import "./BT4-075.js";

describe("BT4-075 Blastmon", () => {
  it("has Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-075", as: "blast" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);
  });

  it("lets the opponent redirect its attack to an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: {
          battleArea: [
            { card: "BT2-083", as: "declared", suspended: true },
            { card: "BT1-009", as: "redirect" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const declaredId = s.perm("declared").permanentId;
    const redirectId = s.perm("redirect").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: declaredId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === redirectId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === redirectId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === declaredId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.decisions).toContainEqual(
      expect.objectContaining({
        seat: 1,
        req: expect.objectContaining({ kind: "selectCards" }),
      }),
    );
  });

  it("lets the defending player decline the redirect without prompting Blastmon's controller", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: {
          battleArea: [
            { card: "BT2-083", as: "declared", suspended: true },
            { card: "BT1-009", as: "redirect" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const declaredId = s.perm("declared").permanentId;
    const redirectId = s.perm("redirect").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: declaredId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!;
    expect(decision.seat).toBe(1);
    expect(decision.req.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === redirectId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === declaredId)).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });
});

const isOnBoard = (s: EngineSetup, seat: 0 | 1, permanentId: string): boolean =>
  s.state.players[seat]!.battleArea.some((permanent) => permanent.permanentId === permanentId);

const pendingRedirectChoice = (s: EngineSetup) => {
  const decision = s.decisions.at(-1)!;
  expect(decision.seat).toBe(1);
  expect(decision.req.kind).toBe("selectCards");
  return decision.req;
};

const answerRedirect = (s: EngineSetup, instanceIds: string[]) =>
  s.engine.applyIntent(1, {
    type: "respondDecision",
    decisionId: pendingRedirectChoice(s).decisionId,
    response: { kind: "selectCards", instanceIds },
  });

describe("BT4-075 Blastmon — KB Q&A rulings", () => {
  it("lets the opponent pick any unsuspended Digimon and forces the attack onto it even when the player was attacked (Q1224)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "redirect" },
            { card: "BT1-010", as: "resting", suspended: true },
          ],
          security: 3,
        },
      },
      { autoSelectCards: false },
    );
    const redirectId = s.perm("redirect").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const candidates = pendingRedirectChoice(s).options?.candidateInstanceIds ?? [];
    expect(candidates).toContain(s.perm("redirect").permanentId);
    expect(candidates).not.toContain(s.perm("resting").permanentId);
    expect(candidates).not.toContain(s.perm("blast").permanentId);

    expect(answerRedirect(s, [s.perm("redirect").permanentId])).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(isOnBoard(s, 1, redirectId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("requires the attacker to declare a legal target before the redirect can happen (Q1225)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: { battleArea: [{ card: "BT1-009", as: "redirect" }], security: 3 },
      },
      { autoSelectCards: false },
    );
    const attackerPermanentId = s.perm("blast").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "permanent", permanentId: "no-such-permanent" },
      }),
    ).not.toEqual({ ok: true });
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const declarations = s.events.filter((event) => event.kind === "attackDeclared");
    expect(declarations).toEqual([expect.objectContaining({ attackerPermanentId, target: { kind: "player" } })]);
    expect(pendingRedirectChoice(s).options?.candidateInstanceIds).toContain(s.perm("redirect").permanentId);
  });

  it("cannot declare an attack on an unsuspended Digimon, but the opponent may move the attack onto one (Q1226)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unsuspended" },
            { card: "BT1-010", as: "declared", suspended: true },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const attackerPermanentId = s.perm("blast").permanentId;
    const unsuspendedId = s.perm("unsuspended").permanentId;
    const declaredId = s.perm("declared").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "permanent", permanentId: unsuspendedId },
      }),
    ).not.toEqual({ ok: true });
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "permanent", permanentId: declaredId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(answerRedirect(s, [s.perm("unsuspended").permanentId])).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(isOnBoard(s, 1, unsuspendedId)).toBe(false);
    expect(isOnBoard(s, 1, declaredId)).toBe(true);
  });

  it("does not force the defender to switch targets; declining keeps the original attack on the player (Q1227)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: { battleArea: [{ card: "BT1-009", as: "unsuspended" }], security: 3 },
      },
      { autoSelectCards: false },
    );
    const unsuspendedId = s.perm("unsuspended").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(pendingRedirectChoice(s).options?.min ?? 0).toBe(0);
    expect(answerRedirect(s, [])).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(isOnBoard(s, 1, unsuspendedId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("can switch the attack onto a Neptunemon that can't be attacked, and a normal battle follows (Q1309)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blast" }] },
        1: { battleArea: [{ card: "BT5-030", as: "neptunemon" }], security: 3 },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const blastId = s.perm("blast").permanentId;
    const neptunemonId = s.perm("neptunemon").permanentId;
    expect(observe(s.engine).isRestricted(s.perm("neptunemon"), "cantBeAttacked")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: blastId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(pendingRedirectChoice(s).options?.candidateInstanceIds).toContain(neptunemonId);
    expect(answerRedirect(s, [neptunemonId])).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "combatResolved",
        attackerPermanentId: blastId,
        deletedPermanentIds: [neptunemonId],
      }),
    );
    expect(isOnBoard(s, 1, neptunemonId)).toBe(false);
    expect(isOnBoard(s, 0, blastId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });
});
