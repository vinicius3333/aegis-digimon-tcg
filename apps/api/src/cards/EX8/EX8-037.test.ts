import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../LM/LM-029.js";
import "./index.js";
import { compiled } from "./EX8-037.js";

describe("EX8-037", () => {
  it("plays a Uka no Mitama token when Sakuyamon or X Antibody is in its digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayToken",
      tokens: [{ name: "Uka no Mitama", keywords: [{ keyword: "Rush" }] }],
      count: 1,
      payCost: false,
      condition: { kind: "anyOf" },
    }));
  it("once per turn may use an Option when one of your Digimon attacks, then unsuspends a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      actions: [
        { kind: "UseOptionWithoutCost", from: ["hand"], optional: true },
        { kind: "Unsuspend", condition: { kind: "ifThisEffectUsed" } },
      ],
    }));
  it("uses a qualifying Option after attacking and unsuspends the attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-037", as: "sakuyamon" }],
          hand: [
            { card: "LM-029", as: "option" },
            { card: "LM-029", as: "secondOption" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
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
  });

  it("leaves the Option available when the optional use is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-037", as: "sakuyamon" }], hand: [{ card: "LM-029", as: "option" }] },
        1: { security: ["BT1-001"] },
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
        1: { security: ["BT1-001"] },
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
