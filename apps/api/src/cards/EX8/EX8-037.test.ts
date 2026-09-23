import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT11/BT11-100.js";
import "../BT11/BT11-107.js";
import "../LM/LM-029.js";
import "./index.js";
import { compiled } from "./EX8-037.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("EX8-037", () => {
  it("matches the exact token, attack-use, and alternate-evolution contract", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { cost: 1, isAlternate: true, level: 6, names: ["Sakuyamon"], excludeTraits: ["X Antibody"] },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayToken",
      tokens: [{ name: "Uka no Mitama", keywords: [{ keyword: "Rush" }] }],
      count: 1,
      payCost: false,
      condition: { kind: "anyOf" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "UseOptionWithoutCost",
              from: ["hand"],
              optional: true,
              payCost: false,
              filter: { controller: "mine", kind: ["Option"] },
            },
            {
              kind: "Unsuspend",
              condition: { kind: "ifThisEffectUsed" },
              target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
            },
          ],
        },
      ],
    });
  });
  it("uses a qualifying Option after attacking and unsuspends the attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-037", as: "sakuyamon" }],
          deck: ["BT1-045", "BT1-045"],
          hand: [
            { card: "LM-029", as: "option" },
            { card: "LM-029", as: "secondOption" },
          ],
        },
        1: { security: ["BT1-045", "BT1-045", "BT1-045", "BT1-045", "BT1-045"], deck: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const secondOptionId = s.inst("secondOption").instanceId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("sakuyamon").isSuspended === false &&
        player.hand.filter((card) => card.cardId === "LM-029").length === 1,
    );
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
    expect(player.hand.filter((card) => card.cardId === "LM-029")).toHaveLength(1);
    expect(s.state.memory).toBe(10);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sakuyamon").isSuspended);
    expect(s.perm("sakuyamon").isSuspended).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("secondOption").instanceId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === secondOptionId));
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === secondOptionId)).toBe(true);
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("enforces single-color and cost-5 boundaries independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-037", as: "sakuyamon" },
            { card: "ST23-09", as: "greenBlackSource" },
          ],
          hand: [
            { card: "BT11-100", as: "costFive" },
            { card: "BT11-107", as: "multicolorOverLimit" },
            { card: "ST23-09", as: "multicolorWithinLimit" },
            { card: "BT25-043", as: "singleColorOverLimit" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target" }], security: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costFive").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costFive").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolorOverLimit").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("multicolorWithinLimit").instanceId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("singleColorOverLimit").instanceId);
    const optionCandidates = s.decisions
      .filter(({ req }) => req.kind === "selectCards")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(optionCandidates).toContain(s.inst("costFive").instanceId);
    expect(optionCandidates).not.toContain(s.inst("multicolorWithinLimit").instanceId);
    expect(optionCandidates).not.toContain(s.inst("singleColorOverLimit").instanceId);
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
  });

  it("leaves the Option available when the optional use is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-037", as: "sakuyamon" }], hand: [{ card: "LM-029", as: "option" }] },
        1: { security: ["BT1-045"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sakuyamon").isSuspended);
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
    expect(s.perm("sakuyamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("still unsuspends when the used Option digivolves this card (Q4738)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-037", as: "sakuyamon" }],
          hand: [
            { card: "LM-029", as: "option" },
            { card: "BT13-020", as: "evolver" },
          ],
        },
        1: { security: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sakuyamon").topCard.cardId === "BT13-020");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("sakuyamon").topCard.cardId).toBe("BT13-020");
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "LM-029")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not play a token when neither qualifying source is in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-059", as: "base" }],
        hand: [{ card: "EX8-037", as: "sakuyamonX" }],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-037");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard.cardId).toBe("EX8-037");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Uka-no-Mitama")).toBe(
      false,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the alternate Sakuyamon route and plays the printed 9000 DP Rush token", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST22-05", as: "base" }],
        hand: [{ card: "EX8-037", as: "xAntibody" }],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Uka-no-Mitama"),
    );
    const token = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Uka-no-Mitama",
    )!;
    expect(token.currentDP).toBe(9000);
    expect(observe(s.engine).hasKeyword(token, "Rush")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("uses the X Antibody stack branch for the token condition", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST22-05", as: "base", under: ["BT9-040"] }],
        hand: [{ card: "EX8-037", as: "xAntibody" }],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Uka-no-Mitama"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Uka-no-Mitama")).toBe(
      true,
    );
  });

  it("rejects the alternate evolution onto Sakuyamon with the X Antibody trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-037", as: "base" }],
        hand: [{ card: "EX8-037", as: "xAntibody" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("xAntibody").instanceId)).toBe(true);
  });
});

describe("EX8-037 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("EX8-037")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});
