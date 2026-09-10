import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-056.js";

describe("EX8-056", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-056")).toMatchObject({
      cardId: "EX8-056",
      nameEn: "Syakomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Crustacean", "DS"],
      effectText: expect.stringContaining("Draw 1"),
      inheritedEffectText: expect.stringContaining("level 3 Digimon"),
    });
    expect(getCardDefinition("EX8-056")?.securityEffectText).toBeUndefined();
  });

  it("draws 1 then trashes 1 card on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]));
  it("inherits a once-per-turn attack deletion of an opposing level 3 Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      isInherited: true,
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
        },
      ],
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
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("filler").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
    expect(player.trash).toHaveLength(2);
  });
  it("deletes a real opposing level 3 Digimon when the inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-056"] }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", suspended: true },
            { card: "BT1-009", as: "secondVictim", suspended: true },
            { card: "AD1-001", as: "level4" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
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
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstVictimId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstVictimId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondVictimId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-001")).toBe(true);

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

  it("digivolves for 0 from the standard Purple level-2 route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-006", as: "demimeramon" },
        hand: [{ card: "EX8-056", as: "syakomon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("demimeramon").permanentId,
        instanceId: s.inst("syakomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("demimeramon").topCard.cardId === "EX8-056");

    expect(s.state.memory).toBe(0);
    expect(s.perm("demimeramon").stack.map((card) => card.cardId)).toEqual(["EX8-006"]);
  });
});
