import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-085.js";
import "./BT1-101.js";
import "../index.js"; // the full catalog is registered in a real match

describe("BT1-085 Tai Kamiya", () => {
  it("sets memory to 3 and grants Security Attack +1 to a red Digimon with 4 sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-085", as: "tai" },
          { card: "BT1-025", as: "red", under: ["BT1-001", "BT1-010", "BT1-015", "BT1-020"] },
        ],
      },
    });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tai"));
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).keywordAmount(s.perm("red"), "SecurityAttack")).toBe(1);
  });

  it("sets memory from exactly 2 to 3, but does not lower memory already at 3", async () => {
    const atTwo = setupEngine({ 0: { battleArea: [{ card: "BT1-085", as: "tai" }] } });
    atTwo.state.memory = 2;
    await advance(atTwo.engine).fire(EffectTiming.OnStartTurn, atTwo.perm("tai"));
    expect(atTwo.state.memory).toBe(3);

    const atThree = setupEngine({ 0: { battleArea: [{ card: "BT1-085", as: "tai" }] } });
    atThree.state.memory = 3;
    await advance(atThree.engine).fire(EffectTiming.OnStartTurn, atThree.perm("tai"));
    expect(atThree.state.memory).toBe(3);
  });

  it("does not set memory during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-085", as: "tai" }] } });
    s.state.turnSeat = 1;
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tai"));

    expect(s.state.memory).toBe(1);
  });

  it("requires a red Digimon with at least 4 digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-085", as: "tai" },
          { card: "BT1-025", as: "threeSources", under: ["BT1-001", "BT1-010", "BT1-015"] },
          { card: "BT1-043", as: "blue", under: ["BT1-001", "BT1-010", "BT1-015", "BT1-020"] },
          { card: "BT1-025", as: "eligible", under: ["BT1-001", "BT1-010", "BT1-015", "BT1-020"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("threeSources"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("blue"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("eligible"), "SecurityAttack")).toBe(1);
  });

  it("stacks Security Attack +1 from each Tai Kamiya (Q946)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-085", as: "taiA" },
          { card: "BT1-085", as: "taiB" },
          { card: "BT1-025", as: "red", under: ["BT1-001", "BT1-010", "BT1-015", "BT1-020"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("red"), "SecurityAttack")).toBe(2);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-085", as: "securityTai", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTai"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityTai").instanceId,
      ),
    ).toBe(true);
  });

  it("re-evaluates its source-count aura after the first security check and cancels the extra check", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-085", as: "tai" },
          // A plain Lv.5 attacker: BT1-025 WarGreymon would suppress the [Security] skill this
          // case depends on ("doesn't activate [Security] skills on Option cards it checks").
          { card: "BT1-024", as: "attacker", dp: 20000, under: ["BT1-001", "BT1-010", "BT1-015", "BT1-020"] },
        ],
      },
      1: { security: ["BT1-010", "BT1-101"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").stack.length === 0 &&
        s.state.players[1]!.security.length === 1 &&
        observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack") === 0,
      5000,
    );

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
