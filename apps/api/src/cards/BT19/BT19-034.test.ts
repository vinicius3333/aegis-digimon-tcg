import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-034 Kyubimon", () => {
  it("naturally resolves When Digivolving after evolving from a level-3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-030", as: "base" }],
          hand: [
            { card: "BT19-034", as: "kyubi" },
            { card: "BT19-083", as: "rika" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kyubi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-083"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-083")).toBe(true);
  });

  it.each([0, 1])("When Digivolving may freely play Rika with %s existing Tamers", async (tamerCount) => {
    const existing = tamerCount === 1 ? [{ card: "BT19-081" }] : [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-034", as: "kyubi" }, ...existing],
          hand: [{ card: "BT19-083", as: "rika" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("kyubi"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-083")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("does not play Rika with 2 Tamers and may decline when eligible", async () => {
    const blocked = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-034", as: "kyubi" }, { card: "BT19-081" }, { card: "BT19-083" }],
          hand: [{ card: "BT17-085", as: "rika" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(blocked.engine).fireForPermanent(EffectTiming.WhenDigivolving, blocked.perm("kyubi"));
    expect(blocked.state.players[0]!.hand).toHaveLength(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-034", as: "kyubi" }],
          hand: [{ card: "BT19-083", as: "rika" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fireForPermanent(EffectTiming.WhenDigivolving, declined.perm("kyubi"));
    expect(declined.state.players[0]!.hand).toHaveLength(1);
  });

  it("uses effective Option use cost 2+ and reduces exactly one opponent by 2000 only once", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-037", as: "host", under: ["BT19-034"] }] },
        1: {
          battleArea: [
            { card: "BT19-020", as: "first" },
            { card: "BT19-021", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 1,
      subjectPermanentId: "reduced-use-cost",
    });
    expect(s.perm("first").currentDP).toBe(5000);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "payment-reduced",
    });
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(5000);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 7, subjectPermanentId: "free-use" });
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(5000);
  });

  it("triggers after a cost-2 Option is actually used from hand (Q5464)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-037", as: "host", under: ["BT19-034"] }],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not trigger from an Option Security effect or on the opponent's turn", async () => {
    const security = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-037", as: "host", under: ["BT19-034"] }],
          security: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await security.ready();
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("option"));
    expect(security.perm("target").currentDP).toBe(5000);

    const opponentTurn = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-037", as: "host", under: ["BT19-034"] }] },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    await advance(opponentTurn.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "option",
    });
    expect(opponentTurn.perm("target").currentDP).toBe(5000);
  });
});
