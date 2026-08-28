import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-097.js";
import "../index.js";

describe("BT26-097 compiled fidelity", () => {
  it("encodes the live security surcharge, permanent placement cost, authorized free evolution, and gated tail", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-097")).toMatchObject({
      nameEn: "The Thunder Emperor Awakens",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 2,
      types: ["TS"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: { kind: ["Digimon", "Tamer"], playCostLte: 5, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Static")?.actions).toMatchObject([
      { kind: "CostModifier", costType: "use", handResident: true, amount: 1, scaling: { unit: "security", per: 1 } },
    ]);
    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "place", targetIsPermanent: true, position: "bottom", bindHostAs: "aegiomonHost" },
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "aegiomonHost" },
          from: ["hand", "trash"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
        },
        { kind: "PlaceUnder", position: "top", optional: true },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      scaling: { unit: "security", per: 1 },
    });
  });

  it("adds exactly 1 use cost for each current security card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-097", as: "option" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          battleArea: [{ card: "BT26-030", as: "yellowSource" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("publicly plays a low-cost TS card from hand and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-097", as: "option", faceUp: true }],
          hand: [{ card: "BT26-009", as: "tsCard" }],
          battleArea: [{ card: "BT26-030", as: "tsSource" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-009");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-097");
  });

  it("adds itself to hand even when no eligible Security play exists", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-097", as: "option" }],
          hand: [{ card: "BT25-093", as: "tsOption" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === optionId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("tsOption").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("places the Tamer under and digivolves the same Aegiomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-085", as: "tamer" },
          ],
          hand: [
            { card: "BT26-097", as: "option" },
            { card: "BT24-101", as: "jupitermon" },
          ],
          trash: [{ card: "BT26-029", as: "aegiochusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("aegiomon").topCard.cardId === "BT24-101");

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-101");
    expect(s.perm("aegiomon").stack.map(({ cardId }) => cardId)).toContain("BT24-085");
    expect(s.perm("aegiomon").stack.at(-1)).toMatchObject({ instanceId: s.inst("aegiochusmon").instanceId });
  });

  it("may evolve the selected Aegiomon into Jupitermon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT26-090", as: "tamer" },
          ],
          hand: [{ card: "BT26-097", as: "option" }],
          trash: [{ card: "BT24-101", as: "jupitermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("aegiomon").topCard.instanceId === s.inst("jupitermon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("aegiomon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("may pay the Tamer placement cost and then decline the optional evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-034", as: "aegiomon" },
            { card: "BT24-085", as: "tamer" },
          ],
          hand: [
            { card: "BT26-097", as: "option" },
            { card: "BT24-101", as: "jupitermon" },
          ],
          trash: [{ card: "BT26-029", as: "aegiochusmon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activateDecisionId = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activateDecisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== activateDecisionId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId));

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-034");
    expect(s.perm("aegiomon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("aegiochusmon").instanceId)).toBe(
      true,
    );
  });

  it("cannot digivolve when the Tamer placement cost is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon" }],
          hand: [
            { card: "BT26-097", as: "option" },
            { card: "BT24-101", as: "jupitermon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-097"));

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-034");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT24-101");
  });
});
