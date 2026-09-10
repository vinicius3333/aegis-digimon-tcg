import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-065.js";

describe("EX8-065", () => {
  it("matches the committed catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-065")).toMatchObject({
      cardId: "EX8-065",
      nameEn: "Ryutaro Williams",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["LIBERATOR"],
      evoCosts: [],
      effectText:
        "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.\n[Your Turn] When one of your Digimon with [Tyrannomon]\u00a0in its name attacks, by suspending this Tamer, that Digimon may digivolve into a Digimon card with [Tyrannomon]\u00a0in its name or the [Dinosaur]\u00a0trait in the hand with the digivolution cost reduced by 1.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });
  it("gains 1 memory at the start of the main phase when the opponent has a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("traces the exact security, memory, and attack-time digivolution IR", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toEqual({
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toEqual({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "opponentHas",
        filter: { controllerDefault: "opponent", kind: ["Digimon"] },
        raw: "your opponent has a Digimon",
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toEqual({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }],
      },
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur"], match: "trait" },
            ],
          },
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          abortOnDecline: true,
        },
      ],
    });
  });
  it("may digivolve a Tyrannomon or Dinosaur attacker from hand by suspending this Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true, cost: { kind: "suspend" } }],
    });
  });
  it("plays itself without paying the cost when revealed in security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    }));
  it("plays the exact face-up security card into the battle area without cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: { security: [{ card: "EX8-065", as: "securityCard" }] },
    });
    const instanceId = s.inst("securityCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("gains memory at the real main-phase timing only while the opponent has a Digimon", async () => {
    const positive = setupEngine({
      0: { battleArea: [{ card: "EX8-065", as: "tamer" }] },
      1: { battleArea: ["BT1-010"] },
    });
    await advance(positive.engine).fire(EffectTiming.StartOfYourMainPhase, positive.perm("tamer"));
    expect(positive.state.memory).toBe(1);

    const negative = setupEngine({ 0: { battleArea: [{ card: "EX8-065", as: "tamer" }] } });
    await advance(negative.engine).fire(EffectTiming.StartOfYourMainPhase, negative.perm("tamer"));
    expect(negative.state.memory).toBe(0);
  });
  it("suspends this Tamer to digivolve a real Tyrannomon attacker from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "EX8-065", as: "tamer" },
          ],
          hand: [{ card: "BT1-024", as: "tyrannomon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "BT1-024");

    expect(s.perm("attacker").topCard?.cardId).toBe("BT1-024");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-024")).toBe(false);
    expect(s.state.memory).toBe(8);
  });

  it("uses the Dinosaur alternative and may decline without suspending or evolving", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-052", as: "attacker" },
            { card: "EX8-065", as: "tamer" },
          ],
          hand: [{ card: "EX7-035", as: "dinosaur" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    accepted.state.memory = 3;
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: accepted.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.perm("attacker").topCard.cardId === "EX7-035");
    expect(accepted.state.memory).toBe(1);
    expect(accepted.perm("tamer").isSuspended).toBe(true);

    const declined = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-016", as: "attacker" },
          { card: "EX8-065", as: "tamer" },
        ],
        hand: [{ card: "BT1-024", as: "tyrannomon" }],
      },
      1: { security: ["BT1-009"] },
    });
    declined.state.memory = 3;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision?.kind === "optional");
    const decision = declined.state.pendingDecision!;
    expect(
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.perm("attacker").topCard.cardId).toBe("BT1-016");
    expect(declined.perm("tamer").isSuspended).toBe(false);
    expect(declined.state.memory).toBe(3);
  });

  it("does not offer the effect when a non-Tyrannomon Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 10000 },
            { card: "EX8-065", as: "tamer" },
          ],
          hand: [{ card: "BT1-024", as: "evolution" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("attacker").topCard.cardId).toBe("BT1-010");
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-024");
  });
});
