import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-055", as: "dan" }] }, 1: { battleArea: [{ card: "BT1-024", as: "victim" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dan"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
