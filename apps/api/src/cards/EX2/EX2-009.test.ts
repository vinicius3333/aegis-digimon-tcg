import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./EX2-009.js";

describe("EX2-009 Growlmon", () => {
  it("uses only the 4000 DP replacement limit with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-009", as: "attacker" }, "EX2-056"] },
        1: {
          battleArea: [
            { card: "ST1-04", as: "target4000" },
            { card: "ST4-09", as: "target7000" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const target7000Id = s.perm("target7000").permanentId;
    await s.ready();
    expect(s.perm("target4000").currentDP).toBe(4000);
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

  it("uses the 2000 DP base limit without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-009", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST1-04", as: "target4000" },
            { card: "ST7-02", as: "target2000" },
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
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("target4000").permanentId);
  });

  it("deletes a 3000 DP target from a Growlmon-family host as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", under: [{ card: "EX2-009", as: "source" }], as: "attacker" }] },
        1: { battleArea: [{ card: "EX2-031", dp: 3000, as: "target" }], security: ["BT1-001"] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("applies its inherited 3000 DP limit once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", under: [{ card: "EX2-009", as: "source" }], as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX2-031", dp: 3000, as: "target" },
            { card: "EX2-031", dp: 3000, as: "secondTarget" },
            { card: "EX2-031", dp: 4000, as: "aboveLimit" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnUseAttack, s.inst("source"));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("aboveLimit").permanentId),
    ).toBe(true);

    await advance(s.engine).fireForInstance(EffectTiming.OnUseAttack, s.inst("source"));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});
