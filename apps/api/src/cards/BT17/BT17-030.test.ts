import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-030.js";
import "./index.js";

/** Inert main-deck Digimon used as neutral security/deck filler. */
const INERT = ["BT1-009", "BT1-013", "BT1-014", "BT1-012"] as const;

describe("BT17-030", () => {
  it("matches the catalog identity, printed text and Bibimon alternate evolution route", () => {
    expect(getCardDefinition("BT17-030")).toMatchObject({
      nameEn: "Pulsemon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Beastkin", "Abadin Electronics"],
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
    });
    const printed = getCardDefinition("BT17-030")!.effectText!;
    expect(printed).toContain("[Digivolve][Bibimon]: Cost 0");
    expect(printed).toContain(
      "[Start of Your Main Phase] By placing 1 [Leon Alexander] from your hand as this Digimon's bottom digivolution card, if you have 3 or more security cards, gain 1 memory. If you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.",
    );
    expect(matchingAlternateDigivolutionRequirement("BT17-030", "BT17-003")).toMatchObject({
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains memory by placing the exactly-named Leon Alexander under itself", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "securityAtLeast", value: 3 },
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
        target: { filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "nameExact" }] } },
      },
    });
  });

  it("adds a security card from deck when security is 2 or fewer and has inherited Pulsemon DP", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      source: "deck",
      amount: 1,
      condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
      cost: {
        kind: "place",
        target: { filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "nameExact" }] } },
      },
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
  });

  it("places Leon Alexander and gains 1 memory at a real main-phase start with 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "pulsemon" }],
          hand: [
            { card: "BT17-086", as: "leon" },
            { card: "BT17-029", as: "spare" },
          ],
          deck: [...INERT],
          security: [...INERT.slice(0, 3)],
        },
        1: { deck: [...INERT], security: [...INERT.slice(0, 3)] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const leonId = s.inst("leon").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("pulsemon").stack.some((card) => card.instanceId === leonId));

    expect(s.state.memory).toBe(4);
    expect(s.perm("pulsemon").stack.map((card) => card.instanceId)).toEqual([leonId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === leonId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("places Leon Alexander and recovers 1 from the deck at a real main-phase start with 2 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "pulsemon" }],
          hand: [
            { card: "BT17-086", as: "leon" },
            { card: "BT17-029", as: "spare" },
          ],
          deck: [{ card: "BT1-009", as: "recovered" }, "BT1-013", "BT1-014", "BT1-012"],
          security: [...INERT.slice(0, 2)],
        },
        1: { deck: [...INERT], security: [...INERT.slice(0, 3)] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const leonId = s.inst("leon").instanceId;
    const recoveredId = s.inst("recovered").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(recoveredId);
    expect(s.perm("pulsemon").stack.map((card) => card.instanceId)).toEqual([leonId]);
    // The low-security branch pays the same placement cost but grants no memory.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  // Q2777: the "by placing" cost is not optional-with-a-fallback — skipping it aborts the
  // whole effect, so the Recovery never activates.
  it("Q2777: does not recover when the placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "pulsemon" }],
          hand: [
            { card: "BT17-086", as: "leon" },
            { card: "BT17-029", as: "spare" },
          ],
          deck: [{ card: "BT1-009", as: "recovered" }, "BT1-013", "BT1-014", "BT1-012"],
          security: [...INERT.slice(0, 2)],
        },
        1: { deck: [...INERT], security: [...INERT.slice(0, 3)] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const leonId = s.inst("leon").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === leonId)).toBe(true);
    expect(s.perm("pulsemon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  // The placement cost is the only way in: with no [Leon Alexander] in hand neither branch
  // can activate, so the low-security board stays untouched.
  it("does not fire when no Leon Alexander is in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "pulsemon" }],
          hand: [
            { card: "BT1-009", as: "otherCard" },
            { card: "BT17-029", as: "spare" },
          ],
          deck: [...INERT],
          security: [...INERT.slice(0, 2)],
        },
        1: { deck: [...INERT], security: [...INERT.slice(0, 3)] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("pulsemon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("otherCard").instanceId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly digivolves from Bibimon through the printed [Bibimon] route for 0", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT17-003", as: "bibimon" }, hand: [{ card: "BT17-030", as: "pulsemon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    const bibimonId = s.inst("bibimon").instanceId;
    const pulsemonId = s.inst("pulsemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bibimon").permanentId,
        instanceId: pulsemonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === pulsemonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([bibimonId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publicly digivolves from a yellow Lv2 egg through the normal route for 1", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-005", as: "kyaromon" }, hand: [{ card: "BT17-030", as: "pulsemon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    const kyaromonId = s.inst("kyaromon").instanceId;
    const pulsemonId = s.inst("pulsemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyaromon").permanentId,
        instanceId: pulsemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === pulsemonId);

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([kyaromonId]);
  });

  it("refuses an off-color Lv2 source that is not named Bibimon", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-002", as: "bebydomon" }, hand: [{ card: "BT17-030", as: "pulsemon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bebydomon").permanentId,
        instanceId: s.inst("pulsemon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-002");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("grants inherited DP only when the host text mentions Pulsemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-034", dp: 6000, under: ["BT17-030"], as: "matching" },
          { card: "BT17-033", dp: 6000, under: ["BT17-030"], as: "nonMatching" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("matching").currentDP).toBe(7000);
    expect(s.perm("nonMatching").currentDP).toBe(6000);
  });
});
