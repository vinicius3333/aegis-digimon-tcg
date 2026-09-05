import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-038.js";
import "./EX2-060.js";
import "./EX2-065.js";

describe("EX2-038 Justimon: Blitz Arm", () => {
  it("may choose the +2000 DP mode when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-035", as: "base" }], hand: [{ card: "EX2-038", as: "evolution" }] } },
      { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 13000);
    expect(s.perm("base").currentDP).toBe(13000);
  });

  it("can choose the unsuspend mode after digivolving while suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-035", as: "base", suspended: true }],
          hand: [{ card: "EX2-038", as: "evolution" }],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("deletes an opposing play-cost-5 Digimon but not one costing 6 or more", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-035", as: "base" }], hand: [{ card: "EX2-038", as: "evolution" }] },
        1: {
          battleArea: [
            { card: "EX2-019", as: "atLimit" },
            { card: "EX2-022", as: "aboveLimit" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 2, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const atLimitId = s.perm("atLimit").permanentId;
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atLimitId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([aboveLimitId]);
  });

  it("reactivates its When Digivolving effect once for each Tamer when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-038", as: "justimon" }, "EX2-060", "EX2-065"],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("justimon").currentDP === 15000);
    expect(s.perm("justimon").currentDP).toBe(15000);

    await advance(s.engine).verb.unsuspend([s.perm("justimon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("justimon").currentDP).toBe(15000);
  });

  it("does not activate its When Attacking effect when no Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-038", as: "justimon" }] },
        1: { security: ["BT1-001"] },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("justimon").currentDP).toBe(11000);
  });
});
