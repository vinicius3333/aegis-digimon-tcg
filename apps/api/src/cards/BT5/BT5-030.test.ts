import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-075.js";
import "../BT4/BT4-090.js";
import "../ST5/ST5-11.js";
import "./BT5-030.js";

describe("BT5-030 Neptunemon", () => {
  it("can't be targeted by an opponent's attack during their turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-030", as: "neptunemon", suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("neptunemon"), "cantBeAttacked")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("neptunemon").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("is not restricted from being attacked during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-030", as: "neptunemon" }] } });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("neptunemon"), "cantBeAttacked")).toBe(false);
  });

  it("keeps the opponent-turn restriction after a legal blue level-5 evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-029", as: "level5", suspended: true }],
          hand: [{ card: "BT5-030", as: "neptunemon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("level5").permanentId,
        instanceId: s.inst("neptunemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("level5").topCard?.cardId === "BT5-030");

    expect(s.perm("level5").stack.map((card) => card.cardId)).toEqual(["BT5-029"]);
    expect(s.perm("level5").topCard?.cardId).toBe("BT5-030");
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("level5"), "cantBeAttacked")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("level5").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can be chosen by a Blocker effect when an opponent attacks the player (Q1307)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 1000 }] },
      1: { battleArea: [{ card: "BT5-030", as: "neptunemon", under: ["ST5-11"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("neptunemon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("rejects Chaosmon's effect-driven attack target during the opponent's turn (Q1308)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-057", as: "base", suspended: true }],
          hand: [{ card: "BT4-090", as: "chaosmon" }],
        },
        1: { battleArea: [{ card: "BT5-030", as: "neptunemon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT5-030")).toBe(true);
  });

  it("allows Blastmon's redirect to switch an attack onto Neptunemon (Q1309)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-075", as: "blastmon" }] },
        1: { battleArea: [{ card: "BT5-030", as: "neptunemon", dp: 20_000 }], security: ["BT5-023"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blastmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT4-075"));
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT4-075")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT5-030")).toBe(true);
  });
});
