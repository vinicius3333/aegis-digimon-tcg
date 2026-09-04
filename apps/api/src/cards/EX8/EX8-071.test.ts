import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-071.js";

describe("EX8-071", () => {
  it("waives its color requirement with no face-up security cards and grants all NSo Digimon Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "noFaceUpSecurity" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Scapegoat" },
      target: { count: "all" },
      duration: "permanent",
    });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
    ]);
  });
  it("contains the printed Security, static, All Turns, and Main effects", () =>
    expect(compiled.effects).toHaveLength(4));
  it("plays the exact level-5-or-lower NSo card from hand through Security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: "EX8-071", as: "option" }], hand: [{ card: "EX8-059", as: "nso" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("nso").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    ).toBe(true);
  });
  it("grants Scapegoat only to NSo and performs mandatory ordered Main placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-059", as: "nso" },
          { card: "BT1-010", as: "nonNso" },
        ],
        hand: [{ card: "EX8-071", as: "option" }],
        security: [
          { card: "EX8-071", as: "source", faceUp: true },
          { card: "BT1-002", as: "bottom" },
        ],
      },
    });
    const optionId = s.inst("option").instanceId;
    const topId = s.inst("source").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nso"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonNso"), "Scapegoat")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([topId, optionId]);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
  });
  it("does not waive the color requirement while security contains a face-up card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red" }],
        hand: [{ card: "EX8-071", as: "option" }],
        security: [{ card: "BT1-002", as: "faceUp", faceUp: true }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
  it("uses the granted Scapegoat to survive a losing battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-057", as: "nso", suspended: true },
            { card: "BT1-010", as: "sacrifice" },
          ],
          security: [{ card: "EX8-071", as: "source", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nso").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("nso").permanentId),
    ).toBe(true);
  });
});
