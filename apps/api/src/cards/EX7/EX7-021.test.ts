import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-021.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-021 CrysPaledramon", () => {
  it("has Ice Clad, trashes two evolution cards, and unsuspends if the opponent has no stacked Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("IceClad");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "TrashDigivolution", amount: 2, scope: "acrossDigimon", target: { filter: { controller: "opponent" } } },
      { kind: "Unsuspend", condition: { kind: "opponentHasNone" } },
    ]);
  });
  it("grants Piercing and Security Attack +1 to Ice-Snow while the opponent has no stacked Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toMatchObject([
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
        target: { filter: { isSelfRef: true } },
        while: { kind: "allOf" },
      },
      { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } },
    ]));

  it("trashes two opposing evolution cards across any stacks when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-021", as: "crys", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", under: ["BT1-010"] },
            { card: "BT1-011", under: ["BT1-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crys"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.stack.length === 0));
    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.stack.length === 0)).toBe(true);
    expect(s.perm("crys").isSuspended).toBe(false);
  });

  it("grants conditional Piercing and Security Attack +1 to an Ice-Snow host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-020", as: "host", under: ["EX7-021"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("host"), "Ice-Snow")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(s.perm("host").securityAttack).toBe(2);
  });

  it("withholds the inherited bonuses while an opposing stack remains", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-020", as: "host", under: ["EX7-021"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", under: ["BT1-010"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.perm("host").securityAttack).toBe(1);
  });
});
