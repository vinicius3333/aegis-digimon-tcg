import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-022.js";

describe("EX8-022", () => {
  it("has Ice Clad and trashes 2 digivolution cards from an opposing Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "IceClad",
      raw: "＜Ice Clad＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 2,
      target: { count: 1 },
      fromTop: false,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHasNone" },
    });
  });
  it("inherits Security Attack -1 against an opposing Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    }));
  it("exposes Ice Clad on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-022", as: "frigimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("frigimon"), "IceClad")).toBe(true);
  });
  it("reduces an opposing Digimon's Security Attack when the host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-022", as: "frigimon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });
});
