import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-093.js";

describe("BT15-093", () => {
  it("gives one opposing Digimon -6000 DP, then requires security payment for a second -6000 DP effect", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      cost: { kind: "trash" },
    });
  });

  it("naturally applies both reductions to the same opposing Digimon after trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-033", as: "source" }],
          hand: [{ card: "BT15-093", as: "option" }],
          security: [
            { card: "BT15-034", as: "top" },
            { card: "BT15-037", as: "bottom" },
          ],
        },
        1: { battleArea: [{ card: "BT15-052", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("bottom").instanceId);
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));
});

describe("BT15-093 Celestial Arrow — KB Q&A rulings", () => {
  it("can give -6000 DP twice to the same opposing Digimon for a total of -12000 DP (Q2590)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-033", as: "yellowSource" }],
          hand: [{ card: "BT15-093", as: "arrow" }],
          security: ["BT15-034", "BT15-037"],
        },
        1: {
          battleArea: [
            { card: "BT15-053", as: "bystander" },
            { card: "BT15-052", as: "target", dp: 15000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId, s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    const arrowId = s.inst("arrow").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: arrowId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === arrowId));
    await settle(() => s.state.pendingDecision === undefined);

    const targetingDecisions = s.decisions.filter(({ req }) => req.kind === "chooseTargets");
    expect(targetingDecisions).toHaveLength(2);
    for (const { req } of targetingDecisions) {
      expect(req.options?.candidateInstanceIds).toEqual(
        expect.arrayContaining([s.perm("target").permanentId, s.perm("bystander").permanentId]),
      );
    }
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("bystander").currentDP).toBe(12000);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
