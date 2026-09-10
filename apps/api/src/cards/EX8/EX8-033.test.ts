import { describe, expect, it } from "vitest";
import { getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-033.js";

describe("EX8-033", () => {
  it("matches the committed catalog identity, text, and standard evolution routes", () => {
    expect(getCardDefinition("EX8-033")).toMatchObject({
      cardId: "EX8-033",
      nameEn: "Pumpkinmon",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Puppet", "NSo"],
      effectText:
        "[On Play] [When Digivolving] Return 1 card with the [NSo]\u00a0trait from your trash to the hand.\n[On Deletion] 1 of your opponent's Digimon gets -4000 DP for the turn.",
      inheritedEffectText: "[On Deletion] ＜Recovery +1 (Deck)＞.",
    });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("traces both recovery timings, the exact NSo filter, deletion DP duration, and inherited Recovery IR", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          nameOrTrait: [{ tokens: ["NSo"], match: "trait" }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          nameOrTrait: [{ tokens: ["NSo"], match: "trait" }],
        },
      },
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "OnDeletion" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      duration: "forTheTurn",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      keywords: [{ keyword: "Recovery", amount: 1 }],
    });
  });

  it("returns exactly one NSo card from trash on play and leaves a non-NSo card there", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-033", as: "pumpkin" }],
          trash: [
            { card: "EX8-034", as: "recovered" },
            { card: "BT1-009", as: "notNSo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pumpkin").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("notNSo").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(false);
  });

  it.each([
    ["EX8-032", "yellow NSo", 4],
    ["EX8-059", "purple NSo", 4],
  ] as const)("recovers an NSo card on a real %s evolution (%s)", async (source, _label, memoryCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: source, as: "source" }],
          hand: [{ card: "EX8-033", as: "pumpkin" }],
          trash: [
            { card: "EX8-034", as: "recovered" },
            { card: "BT1-009", as: "notNSo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = memoryCost;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("pumpkin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === s.inst("pumpkin").instanceId);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([source]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("notNSo").instanceId)).toBe(true);
  });

  it("rejects a level-4 source that has neither printed color", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-001", as: "invalidSource" }],
        hand: [{ card: "EX8-033", as: "pumpkin" }],
      },
    });
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("pumpkin").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("AD1-001");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("pumpkin").instanceId)).toBe(true);
  });

  it("gives exactly one opposing Digimon -4000 DP on deletion and expires at turn end", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-033", as: "pumpkin" }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "target", dp: 7000 },
            { card: "EX8-034", as: "other", dp: 7000 },
          ],
          deck: ["BT1-045"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const target = s.perm("target");
    const other = s.perm("other");
    preferInstanceIds.push(target.permanentId);
    const targetBefore = target.currentDP;
    const otherBefore = other.currentDP;
    await advance(s.engine).verb.deletePermanent([s.perm("pumpkin").permanentId]);
    await settle(() => target.currentDP === targetBefore - 4000);
    expect(target.currentDP).toBe(targetBefore - 4000);
    expect(other.currentDP).toBe(otherBefore);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(target.currentDP).toBe(targetBefore);
    expect(other.currentDP).toBe(otherBefore);
  });

  it("resolves inherited Recovery +1 from a legal purple evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "EX8-033", as: "pumpkin" }] }],
        security: 1,
        deck: [{ card: "BT1-010", as: "recovery" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    await s.ready();
    const recoveryId = s.inst("recovery").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => player.security.some((card) => card.instanceId === recoveryId));
    expect(player.security).toHaveLength(2);
    expect(player.security.some((card) => card.instanceId === recoveryId)).toBe(true);
    expect(player.security.find((card) => card.instanceId === recoveryId)?.faceUp).toBe(false);
    expect(player.deck).toHaveLength(0);
  });
});
