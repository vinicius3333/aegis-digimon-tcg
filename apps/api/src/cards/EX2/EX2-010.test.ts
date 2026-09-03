import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./EX2-067.js";
import "./EX2-010.js";

describe("EX2-010 WarGrowlmon", () => {
  it("uses only the 6000 DP replacement limit with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", as: "attacker" }, "EX2-056"] },
        1: {
          battleArea: [
            { card: "ST10-10", as: "target6000" },
            { card: "ST4-09", as: "target7000" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const target7000Id = s.perm("target7000").permanentId;
    await s.ready();
    expect(s.perm("target6000").currentDP).toBe(6000);
    expect(s.perm("target7000").currentDP).toBe(7000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(target7000Id);
  });

  it("uses the 4000 DP base limit without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST10-10", as: "target6000" },
            { card: "ST1-04", as: "target4000" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("target6000").permanentId);
  });

  it("raises another effect's numeric deletion ceiling by 1000 while inherited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-009", under: ["EX2-010"], as: "host" }],
          hand: [{ card: "EX2-067", as: "fireBall" }],
        },
        1: { battleArea: [{ card: "EX2-031", as: "target4000" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fireBall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not raise another effect's deletion ceiling during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-009", under: ["EX2-010"], as: "host" }],
          hand: [{ card: "EX2-067", as: "fireBall" }],
        },
        1: { battleArea: [{ card: "EX2-031", dp: 4000, as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnUseOption, s.inst("fireBall"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
