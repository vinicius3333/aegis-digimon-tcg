import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-090.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-090", () => {
  it("waives the color requirement with Tai and digivolves Agumon into WarGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Digivolve", payCost: false, ignoreRequirements: true }],
    });
  });

  it("plays an Agumon from hand or trash and adds itself in security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally uses a non-red Tai waiver, places the trash stack, and evolves Agumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-095", as: "tai" },
            { card: "BT14-007", as: "agumon" },
          ],
          hand: [
            { card: "BT14-090", as: "option" },
            { card: "BT14-101", as: "wargreymon" },
          ],
          trash: ["BT14-012", "BT14-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard?.cardId === "BT14-101");
    expect(s.perm("agumon").topCard?.cardId).toBe("BT14-101");
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-012", "BT14-014"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-012")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-014")).toBe(false);
  });

  it("naturally plays Agumon from hand and returns itself after a Security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: {
          security: [{ card: "BT14-090", as: "securityOption" }],
          hand: [{ card: "BT14-007", as: "agumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-090")).toBe(true);
  });
});
