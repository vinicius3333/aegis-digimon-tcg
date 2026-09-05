import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-056.js";

describe("EX8-056", () => {
  it("draws 1 then trashes 1 card on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "Trash", target: { count: 1 } },
    ]));
  it("inherits a once-per-turn attack deletion of an opposing level 3 Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } } }],
    }));
  it("exposes the zero-cost DS level-2 evolution route", () =>
    expect(digivolutionRequirementsFor("EX8-056")).toContainEqual({
      level: 2,
      traits: ["DS"],
      cost: 0,
      isAlternate: true,
    }));
  it("draws then trashes exactly one hand card when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-056", as: "source" }],
          hand: [{ card: "BT1-010", as: "filler" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("filler").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
    expect(player.trash).toHaveLength(2);
  });
  it("deletes a real opposing level 3 Digimon when the inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-056"] }] },
        1: {
          battleArea: [
            { card: "BT1-016", as: "victim", suspended: true },
            { card: "BT1-016", as: "secondVictim", suspended: true },
            { card: "AD1-001", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const firstVictimId = s.perm("victim").topCard.instanceId;
    const secondVictimId = s.perm("secondVictim").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstVictimId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstVictimId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondVictimId)).toBe(
      true,
    );

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondVictimId)).toBe(
      true,
    );
  });

  it("digivolves for 0 from an off-color level-2 DS stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-002", as: "bukamon" },
        hand: [{ card: "EX8-056", as: "syakomon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bukamon").permanentId,
        instanceId: s.inst("syakomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bukamon").topCard.cardId === "EX8-056");

    expect(s.state.memory).toBe(0);
    expect(s.perm("bukamon").stack.map((card) => card.cardId)).toEqual(["EX8-002"]);
  });
});
