import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-057.js";
import "../index.js";

describe("BT21-057 Greymon", () => {
  it("preserves both alternate Digivolution requirements and complete coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 2, isAlternate: true, level: 3 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("grants the opponent's Digimon the printed conditional start-of-main attack", () => {
    const triggers = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));

    expect(triggers).toHaveLength(2);
    for (const effect of triggers) {
      expect(effect.actions[0]).toMatchObject({
        kind: "GrantStatic",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        grant: "tokenEffect",
        tokens: ["GRANTEFFECT23TOKEN"],
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "youHave",
          filter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              { tokens: ["Tai Kamiya"], match: "name" },
              { tokens: ["ADVENTURE"], match: "trait" },
            ],
          },
        },
      });
    }
    expect(compiled.effects).toContainEqual({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    });
  });

  it("with Tai, grants a selected opponent Digimon a forced start-of-main attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT21-057", as: "greymon" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("target")).length === 1);

    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("target"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not grant the attack effect without Tai Kamiya or an ADVENTURE Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-057", as: "greymon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("greymon"));

    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(0);
  });

  it("alternate-digivolves from Agumon for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-040", as: "agumon" }],
        hand: [{ card: "BT21-057", as: "greymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.instanceId === s.inst("greymon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("grants Reboot to a realistic evolution host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-051", as: "host", under: [{ card: "BT21-057", as: "source" }] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
