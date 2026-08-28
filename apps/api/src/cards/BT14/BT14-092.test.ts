import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-092.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-092", () => {
  it("restricts up to three opposing Digimon with no more digivolution cards than the chosen one", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SelectBind",
      target: { bindAs: "chosenDigimon" },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
      target: { count: 3 },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      target: { filter: { relativeTo: { attr: "digivolutionCount", op: "lte", selectionRef: "chosenDigimon" } } },
    });
  });

  it("restricts one opposing Digimon from attacking in security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "Restrict", restriction: "attack" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally snapshots the chosen stack count and restricts three eligible opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-083", as: "joe" },
            { card: "BT14-058", as: "chosen", under: ["BT14-005", "BT14-055"] },
          ],
          hand: [{ card: "BT14-092", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "oneSource", under: ["BT14-055"] },
            { card: "BT14-058", as: "twoSources", under: ["BT14-005", "BT14-055"] },
            { card: "BT14-058", as: "noSources" },
            { card: "BT14-062", as: "tooMany", under: ["BT14-005", "BT14-055", "BT14-058"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("oneSource"), "attack"));

    for (const alias of ["oneSource", "twoSources", "noSources"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "attack")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(alias), "block")).toBe(true);
    }
    expect(observe(s.engine).isRestricted(s.perm("tooMany"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tooMany"), "block")).toBe(false);
  });

  it("naturally restricts one opposing attacker when revealed in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: { security: [{ card: "BT14-092", as: "securityOption" }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-092"));

    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attack")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-092")).toBe(true);
  });
});
