import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-036.js";

describe("EX8-036", () => {
  it("matches the committed catalog identity, evolution, and printed text", () => {
    expect(getCardDefinition("EX8-036")).toMatchObject({
      cardId: "EX8-036",
      nameEn: "SkullMammothmon",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 3 },
        { color: "Purple", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Undead", "NSo"],
      effectText:
        "[Digivolve]Lv.5 w/[NSo]\u00a0trait: Cost 3 \n\n[When Digivolving] You may play 1 [NSo]\u00a0trait Digimon card with a play cost of 5 or less from your hand or trash without paying the cost.\n[On Deletion] ＜Recovery +1 (Deck)＞.",
    });
    expect(getCardDefinition("EX8-036")?.inheritedEffectText).toBeUndefined();
    expect(digivolutionRequirementsFor("EX8-036")).toEqual([{ level: 5, traits: ["NSo"], cost: 3, isAlternate: true }]);
  });

  it("traces the optional hand/trash NSo play ceiling and mandatory Recovery IR", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["NSo"], cost: 3, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          playCostLte: 5,
          nameOrTrait: [{ tokens: ["NSo"], match: "trait" }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toEqual([
      { keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" },
    ]);
  });

  it("uses the alternate NSo route and plays an exact-cost eligible card from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-033", as: "base" }],
          hand: [{ card: "EX8-036", as: "skull" }],
          trash: [
            { card: "EX8-013", as: "eligible" },
            { card: "BT1-038", as: "notNSo" },
            { card: "EX8-033", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skull").instanceId);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-013"));
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-033"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("notNSo").instanceId, s.inst("tooExpensive").instanceId]),
    );
  });

  it.each([
    ["EX8-034", "yellow standard"],
    ["BT2-075", "purple standard"],
  ] as const)("uses the %s legal route and plays an eligible NSo card from hand (%s)", async (source, _label) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: source, as: "base" }],
          hand: [
            { card: "EX8-036", as: "skull" },
            { card: "EX8-013", as: "eligible" },
            { card: "BT1-038", as: "notNSo" },
            { card: "EX8-033", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skull").instanceId);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-013"));
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([source]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("notNSo").instanceId, s.inst("tooExpensive").instanceId]),
    );
  });

  it("allows the optional play to be declined after a legal alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-033", as: "base" }],
          hand: [
            { card: "EX8-036", as: "skull" },
            { card: "EX8-013", as: "candidate" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-036");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("base").topCard.cardId).toBe("EX8-036");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("rejects the alternate route for a non-NSo level-5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "invalidSource" }],
        hand: [{ card: "EX8-036", as: "skull" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-020");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("skull").instanceId)).toBe(true);
  });

  it("recovers the exact top deck card face-down on deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-036", as: "skull" }],
        security: 1,
        deck: [{ card: "BT1-009", as: "recovery" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    await s.ready();
    const recoveryId = s.inst("recovery").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId]);
    await settle(() => player.security.some((card) => card.instanceId === recoveryId));
    expect(player.security).toHaveLength(2);
    expect(player.security.find((card) => card.instanceId === recoveryId)?.faceUp).toBe(false);
    expect(player.deck).toHaveLength(0);
    expect(player.trash.some((card) => card.instanceId === s.inst("skull").instanceId)).toBe(true);
  });
});
