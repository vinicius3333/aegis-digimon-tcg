import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-071.js";

describe("EX8-071", () => {
  it("waives its color requirement with no face-up security cards and grants all NSo Digimon Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone", filter: { faceUp: true } },
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
      { kind: "SecurityManipulation", op: "toHand", position: "bottom" },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
    ]);
  });
  it("contains the printed Security, static, All Turns, and Main effects", () => expect(compiled.effects).toHaveLength(4));
  it("plays the exact level-5-or-lower NSo card from hand through Security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [{ card: "EX8-071", as: "option" }], hand: [{ card: "EX8-059", as: "nso" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const instanceId = s.inst("nso").instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));

    expect((s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
