import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-043.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-043", () => {
  it("reduces play cost by trashing a Cyborg or Ver.5 card from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")).toMatchObject({
      actions: [{ kind: "ReducePlayCost", amount: { kind: "fixed", value: 2 }, payment: { kind: "trashFromHand" } }],
    }));
  it("places a trash Digimon underneath, de-digivolves, and deletes an opposing Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "PlaceUnder", faceDown: true, position: "bottom" },
        { kind: "DeDigivolve", amount: { kind: "countFaceDownDigivolutionCards" } },
        { kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } },
      ],
    }));
  it("has inherited Piercing", () =>
    expect(
      compiled.effects?.find((entry) => entry.actions.some((action) => action.kind === "GainKeyword")),
    ).toMatchObject({
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
    }));
  it("accepts Tyrannomon name or DM trait as separate alternate evolution routes", () =>
    expect(compiled.digivolutionRequirement).toEqual([
      { cost: 3, isAlternate: true, level: 4, names: ["Tyrannomon"] },
      { cost: 3, isAlternate: true, traits: ["DM"] },
    ]));

  it("trashes an eligible hand card and reduces the play cost by exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-043", as: "metal" },
            { card: "BT1-021", as: "payment" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const paymentId = s.inst("payment").instanceId;
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
    await settle(() => player.battleArea.length > 0);
    expect(before - s.state.memory).toBe(5);
    expect(player.hand.find((card) => card.instanceId === paymentId)).toBeUndefined();
  });

  it("does not reduce the cost or trash an ineligible hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-043", as: "metal" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const plainId = s.inst("plain").instanceId;
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
    await settle(() => player.battleArea.length > 0);
    expect(before - s.state.memory).toBe(7);
    expect(player.hand.find((card) => card.instanceId === plainId)).toBeDefined();
  });

  it("places a face-down trash card, de-digivolves once, and deletes a 3000 DP target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-043", as: "metal" }], trash: ["BT1-012"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
    await settle(() => opponent.battleArea.length === 0);
    const played = (s.state.players[0] as PlayerState).battleArea[0];
    expect(played).toBeDefined();
    expect(played!.stack.some((card) => card.cardId === "BT1-012" && !card.faceUp)).toBe(true);
    expect(opponent.battleArea).toHaveLength(0);
  });
});
