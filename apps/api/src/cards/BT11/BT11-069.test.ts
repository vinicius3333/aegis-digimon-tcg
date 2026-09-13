import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-069.js";

describe("BT11-069 MetalGreymon (X Antibody)", () => {
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
        0: { battleArea: [{ card: "BT11-064", as: "base" }], hand: [{ card: "BT11-069", as: "metal" }] },
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

    // A second real unsuspend in the same opponent turn is suppressed.
    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("secondOpponent").permanentId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds.slice(1));
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([securityIds[0]]);
    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    // Pass a complete neutral turn; the second opponent Digimon stays suspended for the reset.
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

  it("does not trash security when its controller's Digimon unsuspends", async () => {
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

    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
