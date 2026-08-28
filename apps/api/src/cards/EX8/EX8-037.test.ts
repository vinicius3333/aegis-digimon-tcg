import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
      { 0: { battleArea: [{ card: "EX8-037", as: "sakuyamon" }], hand: [{ card: "LM-029", as: "option" }] } },
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
      () => s.perm("sakuyamon").isSuspended === false && !player.hand.some((card) => card.cardId === "LM-029"),
    );
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
    expect(player.hand.some((card) => card.cardId === "LM-029")).toBe(false);
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
});
