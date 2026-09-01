import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-074.js";
describe("BT11-074 BlackWarGreymon X", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-074")).toMatchObject({
      cardId: "BT11-074",
      colors: ["Black", "Red"],
      level: 6,
      playCost: 13,
      dp: 13000,
      types: ["Dragonkin", "X Antibody"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Reboot" }] },
      { trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }] },
      { trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenUnsuspended" }] },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["BlackWarGreymon"], cost: 2, isAlternate: true }]);
  });

  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-074", as: "bwarg" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("bwarg"), "Reboot")).toBe(true);
  });

  it("digivolves for 2 from BlackWarGreymon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-070", as: "blackWarGreymon" }],
        hand: [{ card: "BT11-074", as: "xAntibody" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackWarGreymon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackWarGreymon").topCard.cardId === "BT11-074");

    expect(s.state.memory).toBe(3);
  });

  it("redirects an attack declared by the opponent's highest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-074", as: "bwarg" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "highest", dp: 5000 },
            { card: "BT1-011", as: "lower", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const highestId = s.perm("highest").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: highestId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not redirect an attack declared by a lower-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-074", as: "bwarg" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "highest", dp: 5000 },
            { card: "BT1-011", as: "lower", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("may delete the lowest-play-cost opponent when their Digimon unsuspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-074", as: "bwarg", under: ["BT9-109"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "unsuspended" },
            { card: "BT1-081", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("unsuspended").permanentId,
    });

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-081"]);
  });
});
