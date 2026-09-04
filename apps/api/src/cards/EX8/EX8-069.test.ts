import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX8-069.js";
import "./index.js";

describe("EX8-069", () => {
  it("waives its color requirement with no face-up security cards and grants all NSp Digimon Alliance", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "noFaceUpSecurity" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Alliance" },
      target: { count: "all" },
      duration: "permanent",
    });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
    ]));
  it("contains only the printed effects", () => expect(compiled.effects).toHaveLength(4));
  it("plays an optional level 5 or lower NSp Digimon from hand without cost in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: { security: [{ card: "EX8-069", as: "securityCard" }], hand: [{ card: "EX7-015", as: "nsp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("nsp").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
    );
    expect(
      (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
    ).toBe(true);
    expect((s.state.players[1] as PlayerState).hand.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("grants Alliance to a live NSp Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "nsp" }],
        security: [{ card: "EX8-069", as: "source", faceUp: true }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("nsp"), "Alliance")).toBe(true);
  });
  it("does not waive the color requirement while security contains a face-up card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "blue" }],
        hand: [{ card: "EX8-069", as: "option" }],
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
  it("does not grant Alliance to a non-NSp peer and performs ordered face-up Main placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "nonNsp" },
          { card: "BT1-030", as: "blueSource" },
        ],
        hand: [{ card: "EX8-069", as: "option" }],
        security: [
          { card: "BT1-001", as: "top" },
          { card: "BT1-002", as: "bottom" },
        ],
      },
    });
    const optionId = s.inst("option").instanceId;
    const topId = s.inst("top").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nonNsp"), "Alliance")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([topId, optionId]);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
  });
});
