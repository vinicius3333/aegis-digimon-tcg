import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT11-069.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("BT11-069 MetalGreymon (X Antibody)", () => {
  it("does not restore a Greymon inclusion alias after KingSukamon rewrites the host name", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-068", as: "host", under: ["BT11-069"], suspended: true }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent", suspended: true }],
          hand: [{ card: "BT11-043", as: "king" }],
          trash: ["BT11-040", "BT11-040", "BT11-040"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").originalNameOverride === "Sukamon" && s.state.pendingDecision === undefined);
    expect(observe(s.engine).effectiveNames(s.perm("host"))).toEqual(["sukamon"]);

    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it.each(["BT22-014", "BT9-068", "EX4-048"])(
    "#4974 triggers the inheritance when %s Reboots with its Greymon Rule name",
    async (id) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: id, as: "host", under: ["BT11-069"], suspended: true }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent", suspended: true }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      });
      s.state.turnSeat = 1;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(s.perm("host").isSuspended).toBe(id === "EX4-048");
      expect(s.perm("opponent").isSuspended).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
    },
  );

  it("maps catalog facts and each conditional effect to IR", () => {
    expect(getCardDefinition("BT11-069")).toMatchObject({
      cardId: "BT11-069",
      colors: ["Black", "Red"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Cyborg", "X Antibody"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "GrantStatic" }, { kind: "Delete" }] },
      { trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("gains both protections and deletes a 6000-DP-or-less Digimon with a matching source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-064", as: "base", under: ["BT9-109"] }],
          hand: [{ card: "BT11-069", as: "metal" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(observe(s.engine).isRestricted(s.perm("base"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });

  it("digivolves for 1 from an exact MetalGreymon base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-067", as: "metalGreymon" }],
        hand: [{ card: "BT11-069", as: "xMetalGreymon" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalGreymon").permanentId,
        instanceId: s.inst("xMetalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalGreymon").topCard.cardId === "BT11-069");

    expect(s.state.memory).toBe(3);
  });

  it("trashes security from the real opponent unsuspend phase once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "host", under: ["BT11-069"] }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent", suspended: true },
            { card: "BT1-010", as: "secondOpponent", suspended: true },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds.slice(1));
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([securityIds[0]]);
    expect(s.state.memory).toBe(3);

    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("secondOpponent").permanentId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds.slice(1));
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([securityIds[0]]);
    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const neutralTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await neutralTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const resetTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityIds[2]]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([securityIds[0], securityIds[1]]);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resetTurn;
  });

  it("does not trash security for a host without Greymon or Omnimon in its name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", under: ["BT11-069"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }], security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("opponent").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("also trashes security when its controller's own Digimon unsuspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-069", as: "host", under: ["BT11-069"] },
          { card: "BT1-010", as: "ownDigimon" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponent" }],
        security: ["BT1-009", "BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("ownDigimon").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT11-069 MetalGreymon (X Antibody) — KB Q&A rulings", () => {
  it("activates when an opponent's Digimon becomes unsuspended during the opponent's turn (Q2098)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-064", as: "host", under: ["BT11-069"] }] },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponentDigimon", suspended: true }],
        security: ["BT1-009", "BT1-011"],
      },
    });
    await s.ready();
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);

    await advance(s.engine).verb.unsuspend([s.perm("opponentDigimon").permanentId]);
    expect(s.state.players[1]!.security).toHaveLength(2);

    await advance(s.engine).verb.suspend([s.perm("opponentDigimon").permanentId]);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("opponentDigimon").permanentId]);

    expect(s.perm("opponentDigimon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityIds[1]]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([securityIds[0]]);
  });
});

describe("BT11-069 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT11-069")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});
