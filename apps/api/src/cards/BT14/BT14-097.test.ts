import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-097.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-097", () => {
  it("digivolves a non-white Digimon into Sukamon from hand without cost", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Digivolve", payCost: false, ignoreRequirements: true }],
    }));
  it("changes one opposing Digimon into a white 3000 DP Sukamon in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      actions: [
        { kind: "SetBaseDP", value: 3000 },
        { kind: "GrantStatic", grant: { dp: 3000, color: "white", originalName: "Sukamon" } },
      ],
    }));

  it("naturally free-digivolves a non-white Digimon into Sukamon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "base" },
            { card: "BT14-084", as: "yellowSource" },
          ],
          hand: [
            { card: "BT14-097", as: "option" },
            { card: "BT14-034", as: "sukamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-034");

    expect(s.perm("base").topCard?.cardId).toBe("BT14-034");
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.memory).toBe(7);
  });

  it("naturally transforms an opposing Digimon when revealed in security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "target" },
            { card: "BT14-058", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-097", as: "securityOption" }] },
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
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["White"]);
    expect(observe(s.engine).effectiveNames(s.perm("target"))).toContain("sukamon");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT14-097")).toBe(true);
  });
});
