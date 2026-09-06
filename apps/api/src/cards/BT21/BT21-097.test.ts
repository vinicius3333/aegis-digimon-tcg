import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-097.js";
import "../index.js";

describe("BT21-097 App Link", () => {
  it("verifies the Appmon waiver, reveal-and-place Main, Delay Link, and Security placement", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "trash" });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const delay = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(delay?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(delay?.actions[0]).toMatchObject({
      kind: "Link",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", hasLinkRequirement: true },
        count: 1,
      },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    });

    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("reveals an Appmon/App Driver card, trashes the rest, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-084", as: "color" }],
          hand: [{ card: "BT21-097", as: "option" }],
          deck: [
            { card: "BT21-084", as: "appmon" },
            { card: "BT1-009", as: "restA" },
            { card: "BT1-010", as: "restB" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-097"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("restA").instanceId, s.inst("restB").instanceId]),
    );
  });

  it("Q4734 waives color for an Appmon Digimon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-009", as: "appmon" },
        hand: [{ card: "BT21-097", as: "option" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("ages a publicly played Option before activating Delay at a later own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "appmon" },
            { card: "BT22-016", as: "recipient" },
          ],
          hand: [
            { card: "BT21-097", as: "option" },
            { card: "ST22-08", as: "eligible" },
            { card: "BT22-016", as: "noLink" },
          ],
          deck: ["BT21-084", "BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT22-016", as: "opponent" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));

    // CR 16-17-3: Delay gained this turn cannot activate during this same turn.
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
    expect(s.perm("recipient").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("noLink").instanceId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("recipient").linked.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("noLink").instanceId)).toBe(true);
    expect(s.perm("opponent").linked).toHaveLength(0);
  });

  it("publicly places itself from Security without changing memory", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT21-097", as: "option" }] },
        1: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("option").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
