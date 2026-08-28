import { compiledEffects, EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-067.js";
import "../index.js";

const CARD_ID = "EX12-067";

describe("EX12-067 Kiyoshiro Higashimitarai", () => {
  it("maps the catalog, KB-backed text filters, cost, modal branches, and security", () => {
    const attack = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    const watcher = attack.actions[0]!;
    const modal = irNode(watcher).actions[0]!;

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Jellymon"], match: "text" },
          { tokens: ["DS"], match: "trait" },
        ],
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
    });
    expect(modal).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [[{ kind: "Digivolve" }], [{ kind: "UseOptionWithoutCost" }]],
    });
    expect(modal.options[0]![0]).toMatchObject({
      kind: "Digivolve",
      target: { sourceRef: "triggerSubject" },
      from: ["hand"],
      payCost: true,
      reduceCost: 1,
    });
    expect(modal.options[0]![0]).not.toHaveProperty("ignoreRequirements");
    expect(modal.options[1]![0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      filter: { kind: ["Option"] },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("sets memory to 3 only when the controller starts at 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).fire(EffectTiming.OnStartTurn, low.perm("source"));
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } });
    high.state.memory = 3;
    await high.ready();
    await advance(high.engine).fire(EffectTiming.OnStartTurn, high.perm("source"));
    expect(high.state.memory).toBe(3);
  });

  it("suspends itself and digivolves the attacking Jellymon/DS Digimon with a one-memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kiyo" },
            { card: "EX12-027", as: "attacker" },
          ],
          hand: [{ card: "EX12-030", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "EX12-030", 160);

    expect(s.perm("kiyo").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard?.cardId).toBe("EX12-030");
    expect(s.state.memory).toBe(-1);
  });

  it("Q6870 matches Jellymon in text even without the DS trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kiyo" },
            { card: "BT13-023", as: "attacker" },
          ],
          hand: [{ card: "BT13-026", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT13-026");
    expect(s.perm("kiyo").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("Q6871 two copies consume one selected evolution card only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
            { card: "EX12-027", as: "attacker" },
          ],
          hand: [{ card: "EX12-030", as: "onlyTarget" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferOptionIndex: 0,
      },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "EX12-030");
    expect(s.perm("attacker").stack.filter(({ cardId }) => cardId === "EX12-027")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("Q6872 uses the Option at full cost when play-cost reductions are prohibited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kiyo" },
            { card: "EX12-027", as: "attacker" },
          ],
          hand: [{ card: "BT9-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT9-020", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 4;
    await s.ready();
    advance(s.engine).ledgers.continuous.addCostReductionBlock(0, "play", EffectDuration.UntilEachTurnEnd);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT9-020"));
    expect(s.perm("kiyo").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not waive digivolution requirements when the selected DS card is illegal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kiyo" },
            { card: "EX12-027", as: "attacker" },
          ],
          hand: [{ card: "EX12-033", as: "illegalTarget" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 100);

    expect(s.perm("kiyo").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard?.cardId).toBe("EX12-027");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("illegalTarget").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("uses a matching Jellymon-text Option from hand with the two-memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kiyo" },
            { card: "EX12-027", as: "attacker" },
          ],
          hand: [{ card: "BT9-096", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT9-020", as: "opponentDigimon" }],
          security: ["BT1-101"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT9-020"), 160);

    expect(s.perm("kiyo").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT9-020")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "security", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kiyoshiro Higashimitarai",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      types: ["DS"],
    });
  });
});
