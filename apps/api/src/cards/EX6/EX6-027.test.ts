import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-027.js";

describe("EX6-027 Ophanimon", () => {
  it("has Blast Digivolve and gates an -8000 DP effect behind trashing security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -8000,
      duration: "untilOpponentTurnEnd",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "security" } } },
    });
  });
  it("responds to security removal with attack/recovery effects depending on whose turn it is", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "Attack" },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } },
      ],
    }));
  it("publicly pays with security and gives an opposing Digimon -8000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-027", as: "oph" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oph").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("opponent").currentDP).toBe(before - 8000);
  });

  it("does not offer the paid effect with no security cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-027", as: "oph" }] }, 1: { battleArea: [{ card: "EX6-031", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("oph"));
    expect(s.perm("opponent").currentDP).toBe(before);
  });
});
