import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-091.js";
import "../index.js";

describe("BT15-091", () => {
  it("waives color with Matt Ishida and may digivolve Gabumon into MetalGarurumon by placing Garurumon/WereGarurumon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "compound",
        costs: [
          { kind: "place", bindHostAs: "bt15091Gabumon", position: "bottom" },
          { kind: "place", host: { filter: { boundRef: "bt15091Gabumon" } }, position: "bottom" },
        ],
      },
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "bt15091Gabumon" },
          payCost: false,
          ignoreRequirements: true,
          optional: true,
        },
      ],
    });
  });
  it("may play a Gabumon from hand or trash and returns itself from security", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    }));

  it("naturally places both trash materials under one Gabumon before the optional free evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "gabumon" }],
          trash: [
            { card: "BT15-024", as: "garurumon" },
            { card: "BT15-026", as: "weregarurumon" },
          ],
          hand: [
            { card: "BT15-091", as: "option" },
            { card: "BT15-101", as: "metalgarurumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard?.instanceId === s.inst("metalgarurumon").instanceId);

    expect(s.perm("gabumon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("garurumon").instanceId, s.inst("weregarurumon").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("garurumon").instanceId, s.inst("weregarurumon").instanceId]),
    );
  });

  it("does not consume either material when the mandatory placement pair is incomplete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "gabumon" }],
          trash: [{ card: "BT15-024", as: "garurumon" }],
          hand: [
            { card: "BT15-091", as: "option" },
            { card: "BT15-101", as: "metalgarurumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));

    expect(s.perm("gabumon").topCard?.cardId).toBe("BT15-020");
    expect(s.perm("gabumon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("garurumon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("metalgarurumon").instanceId,
    );
  });
});
