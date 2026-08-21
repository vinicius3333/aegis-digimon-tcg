import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-06.js";

describe("ST19-06 Doggymon", () => {
  it("gives one opposing Digimon Security Attack -1 on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-06", as: "doggy" }] },
      1: { battleArea: [{ card: "BT1-010", as: "targetA" }, { card: "BT1-011", as: "targetB" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("doggy"));
    await settle(() => observe(s.engine).keywordAmount(s.perm("targetA"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("targetA"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("targetB"), "SecurityAttack")).toBe(0);
  });

  it("applies the same effect on deletion and matches the catalog text", () => {
    expect(getCardDefinition("ST19-06")).toMatchObject({
      effectText: "[On Play] [On Deletion] 1 of your opponent's Digimon gains ＜Security Attack -1＞until the end of their turn.",
    });
  });

  it("triggers the Security Attack reduction when deleted in a real battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
      1: { battleArea: [{ card: "ST19-06", as: "doggy", dp: 1000, suspended: true }] },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("doggy").permanentId },
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("doggy").permanentId) &&
      observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack") === -1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
  });
});
