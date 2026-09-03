import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-094.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-094", () => {
  it("offers -6000 DP or deleting an Angemon to place an opposing Digimon as security", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Modal", choose: 1 }] });
    const modal = compiled.effects?.[0]?.actions[0];
    if (modal?.kind !== "Modal") throw new Error("BT14-094 must compile a Modal action");
    expect(modal).toMatchObject({
      options: [[{ kind: "ModifyDP", amount: -6000 }], [{ kind: "SecurityManipulation", op: "placeAsSecurity" }]],
    });
    expect(modal.options?.[1]?.[0]).toMatchObject({ cost: { kind: "deleteOwn" } });
  });

  it("activates the main effect in security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("naturally resolves the -6000 DP modal branch", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-084", as: "tk" }], hand: [{ card: "BT14-094", as: "option" }] },
        1: { battleArea: [{ card: "BT14-058", as: "target", dp: 10000 }] },
      },
      { autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("naturally deletes Angemon and places an opposing Digimon in security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-084", as: "tk" },
            { card: "BT14-102", as: "angemon" },
          ],
          hand: [{ card: "BT14-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT14-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.some((card) => card.cardId === "BT14-058"));

    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT14-058")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-058")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-102")).toBe(false);
  });

  it("naturally applies the -6000 DP branch from a Security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "target", dp: 10000 }] },
        1: { security: [{ card: "BT14-094", as: "securityOption" }] },
      },
      { autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
