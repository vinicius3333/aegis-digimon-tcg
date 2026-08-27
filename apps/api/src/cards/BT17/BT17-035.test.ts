import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-035.js";
import "./index.js";

describe("BT17-035 Taomon", () => {
  it("may use a Plug-In or yellow Option from hand at 2 less on digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
      filter: { controller: "mine", kind: ["Option"] },
      orFilters: [{ nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { colors: ["Yellow"] }],
    });
  });

  it("once per turn inherits the same use only when this Digimon has Sakuyamon in its name", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }],
    });
    expect(effect!.actions[0]).toMatchObject({ condition: { kind: "selfHasNameContaining", names: ["Sakuyamon"] } });
  });

  it("has Barrier and uses a legal yellow Option for 2 less when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", as: "base" }],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
  });

  it("uses the reduced-cost Option from a Sakuyamon host when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [{ card: "BT1-102", as: "option" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });
});
