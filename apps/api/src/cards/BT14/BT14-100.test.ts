import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-100.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-100", () => {
  it("draws when trashed from hand by an effect and deletes an opposing level 4 or lower Digimon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenTrashedFromHand",
      actions: [{ kind: "Draw", amount: 1 }],
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally draws after Fangmon trashes Pummel Whack from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-072", as: "fangmon" },
            { card: "BT14-100", as: "option" },
          ],
          trash: [{ card: "BT14-074", as: "returned" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-100")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-074")).toBe(true);
  });

  it("naturally deletes one opposing level 4 or lower Digimon from Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-075", as: "source" }],
          hand: [{ card: "BT14-100", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "levelFour" },
            { card: "BT14-062", as: "levelFive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const levelFourId = s.perm("levelFour").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFourId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFourId)).toBe(false);
    expect(s.perm("levelFive").topCard?.cardId).toBe("BT14-062");
  });

  it("naturally applies Main from a Security check and deletes the opposing level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: { security: [{ card: "BT14-100", as: "securityOption" }] },
      },
      { autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT14-100")).toBe(true);
  });
});
