import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

const COMPOUND_COST_SHA256 = "255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b";
const ACTIVATION_DECLARATION_SHA256 = "f685a1a969a75e944c958f0cac3704d0c228231ee3865752f6ac20c4b0b49182";

describe("BT14-090 compound activation-cost assignment", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0169",
      "§15-7-3 compound processing conditions cannot be paid only in part",
      COMPOUND_COST_SHA256,
    );
    cite(
      "comprehensive-0176",
      "§15-8-4-4-1 activation-type effects require a performable condition before declaration",
      ACTIVATION_DECLARATION_SHA256,
    );
  });

  it("assigns distinct physical trash cards to both placement components", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-007", as: "agumon" }],
          hand: [{ card: "BT14-090", as: "option" }],
          trash: [
            { card: "BT14-012", as: "greymonA" },
            { card: "BT14-012", as: "greymonB" },
            { card: "BT14-014", as: "metalgreymon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const greymonAId = s.inst("greymonA").instanceId;
    const greymonBId = s.inst("greymonB").instanceId;
    const metalGreymonId = s.inst("metalgreymon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.perm("agumon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([greymonAId, metalGreymonId]),
    );
    expect(s.perm("agumon").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([greymonBId, optionId]);
    expect(s.state.memory).toBe(6);
  });

  it("does not declare an impossible activation-type compound payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-007", as: "agumon" }],
          hand: [{ card: "BT14-090", as: "option" }],
          trash: [{ card: "BT14-012", as: "greymon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const greymonId = s.inst("greymon").instanceId;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.perm("agumon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([greymonId, optionId]);
    expect(s.state.memory).toBe(6);
  });
});
