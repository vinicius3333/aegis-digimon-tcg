import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-038.js";

describe("BT10-038 Sanzomon", () => {
  it("gives exactly one chosen opposing Digimon Security Attack -1 when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT10-038", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "chosen" },
            { card: "BT2-047", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("untouched"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });

  it("keeps the debuff through its owner's turn end and expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT10-038", as: "evolving" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "target" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });

  it("grants the inherited attack debuff only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT10-038"] }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "firstTarget" },
            { card: "BT2-047", as: "secondTarget" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("firstTarget"), "SecurityAttack") === -1);
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(observe(s.engine).keywordAmount(s.perm("firstTarget"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("secondTarget"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });
});
