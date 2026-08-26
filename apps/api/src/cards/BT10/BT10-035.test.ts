import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-035.js";

describe("BT10-035 Darcmon", () => {
  it("encodes one inherited once-per-turn opposing Security Attack -1 grant", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "GainKeyword",
            target: expect.objectContaining({
              filter: expect.objectContaining({ controller: "opponent", kind: ["Digimon"] }),
              count: 1,
            }),
            keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: -1 }),
            duration: "untilOpponentTurnEnd",
          }),
        ],
      }),
    ]);
  });

  it("gives exactly one chosen opponent Digimon Security Attack -1 only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-036", as: "host", under: ["BT10-035"] }] },
        1: {
          battleArea: [
            { card: "BT10-020", as: "chosen" },
            { card: "BT10-020", as: "untouched" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId, s.perm("untouched").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack") === -1);
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

    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("untouched"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });

  it("keeps the inherited debuff until the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-036", as: "host", under: ["BT10-035"] }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT10-020", as: "target" }],
          security: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1 && !observe(s.engine).isAttacking(),
    );

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });
});
