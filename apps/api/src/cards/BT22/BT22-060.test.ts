import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-060.js";

describe("BT22-060 Datamon", () => {
  it("protects itself and gains DP from face-down digivolution cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "cantBeDeDigivolved",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, isSelf: true },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 1000,
        duration: "untilOpponentTurnEnd",
        scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
      });
    }
  });

  it("lets the opponent choose an attacker at end of their turn", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          optional: true,
          drainTimingWindowDuringAttack: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, chooser: "opponent" },
        },
      ],
    });
  });

  it("publicly makes the opponent's chosen unsuspended Digimon attack at their turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-060"] }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen", dp: 20000 },
            { card: "BT1-010", as: "other", dp: 20000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard!.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-010")).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("offers the optional attack, then allows refusal while leaving legal and suspended candidates unchanged", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-060"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "legal" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).runTurn(1);

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-060")).toBe(true);
    expect(s.perm("legal").isSuspended).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("does not create an attack choice when every opponent Digimon is already suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-060"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "suspended" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("suspended").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-060")).toBe(false);
    expect(s.perm("suspended").isSuspended).toBe(true);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("counts only face-down sources for DP and applies De-Digivolve immunity on evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-049",
              as: "base",
            },
          ],
          hand: [
            { card: "BT22-049", as: "faceDownSource" },
            { card: "BT22-049", as: "faceUpSource" },
            { card: "BT22-060", as: "datamon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [
      s.inst("faceDownSource").instanceId,
      s.inst("faceUpSource").instanceId,
    ]);
    s.perm("base").stack.find((card) => card.instanceId === s.inst("faceDownSource").instanceId)!.faceUp = false;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("datamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved"));
    await settle();

    expect(s.perm("base").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });
});
