import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-055.js";

describe("EX6-055 DanDevimon", () => {
  it("deletes an opposing level 5 or lower Digimon, or trashes one of their hand cards if no deletion occurs", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } },
      { kind: "Trash", condition: { kind: "ifThisEffectDidNotAct" } },
    ]));
  it("grants Rush and Security Attack +1 while the opponent has five or fewer hand cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "Rush" } },
        while: { kind: "zoneCount", op: "lte", value: 5 },
      },
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        while: { kind: "zoneCount", op: "lte", value: 5 },
      },
    ]));
  it("publicly deletes an opposing level 5 Digimon on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-055", as: "dan" }] }, 1: { battleArea: [{ card: "BT1-024", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dan"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("publicly trashes one opponent hand card when no qualifying Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-055", as: "host" }] },
        1: { hand: [{ card: "BT1-010", as: "opponentCard" }], battleArea: [{ card: "EX6-043", as: "ineligible" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("host"));
    await settle(() => s.state.players[1]!.hand.length === 0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("publicly grants Rush only at the five-card hand boundary", async () => {
    const active = setupEngine({
      0: { battleArea: [{ card: "EX6-055", as: "host" }] },
      1: { hand: Array.from({ length: 5 }, () => "BT1-010") },
    });
    active.state.turnSeat = 0;
    await active.ready();
    expect(observe(active.engine).hasKeyword(active.perm("host"), "Rush")).toBe(true);
    const inactive = setupEngine({
      0: { battleArea: [{ card: "EX6-055", as: "host" }] },
      1: { hand: Array.from({ length: 6 }, () => "BT1-010") },
    });
    inactive.state.turnSeat = 0;
    await inactive.ready();
    expect(observe(inactive.engine).hasKeyword(inactive.perm("host"), "Rush")).toBe(false);
  });
});
