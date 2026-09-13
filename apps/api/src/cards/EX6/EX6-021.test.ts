import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-021.js";

describe("EX6-021 ArkhaiAngemon", () => {
  it("gates the -4000 DP and Angel-family security placement behind adding security to hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "securityToHand", position: "choice" },
      actions: [
        { kind: "ModifyDP", amount: -4000 },
        { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false },
      ],
    });
  });
  it("grants the Angel trait and inherits Blocker for Angel-family Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Angel"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { count: "all" } }],
    });
  });

  it("publicly trades the top security card for -4000 DP and an Angel security placement", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-009", as: "paid" }],
          hand: [
            { card: "EX6-021", as: "arkhai" },
            { card: "EX6-019", as: "angel" },
          ],
        },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arkhai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("arkhai") !== undefined && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("paid").instanceId)).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("does not resolve the gated effects when the controller has no security", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-021", as: "arkhai" }] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arkhai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("arkhai") !== undefined && s.state.pendingDecision === undefined);
    expect(s.perm("opponent").currentDP).toBe(before);
    expect(s.state.memory).toBe(3);
  });
});
