import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-081.js";
import "../index.js";

describe("BT21-081 Owen Dreadnought", () => {
  it("suspends this Tamer, grants Piercing to a Reptile/Dragonkin, and makes that same Digimon attack", () => {
    const endOfTurn = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endOfTurn?.actions[0]).toMatchObject({
      kind: "SelectBind",
      target: {
        bindAs: "piercingTarget",
        filter: { nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }] },
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(endOfTurn?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      target: { fromSelectionRef: "piercingTarget" },
      keyword: { keyword: "Piercing" },
      duration: "forTheTurn",
    });
    expect(endOfTurn?.actions[2]).toMatchObject({ kind: "Attack", target: { fromSelectionRef: "piercingTarget" } });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["without an opposing Digimon", false, 0],
    ["with an opposing Digimon", true, 1],
  ])("start of main %s gains %i memory", async (_label, hasOpponent, expectedGain) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-081", as: "owen" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("owen"));
    expect(s.state.memory).toBe(expectedGain);
  });

  it("Q4593 suspends Owen, grants Piercing, and forces the selected Digimon to attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-081", as: "owen" },
            { card: "BT21-064", as: "guilmon" },
            { card: "BT1-009", as: "other" },
          ],
        },
        1: { security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("guilmon").permanentId);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("owen"));
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("guilmon").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("guilmon"))).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("declining does not suspend Owen or attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-081", as: "owen" },
            { card: "BT21-064", as: "guilmon" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("owen"));
    expect(s.perm("owen").isSuspended).toBe(false);
    expect(s.perm("guilmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("cannot pay the suspend cost without an eligible Reptile or Dragonkin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-081", as: "owen" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("owen"));
    expect(s.perm("owen").isSuspended).toBe(false);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-081", as: "owen" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("owen").instanceId));
    expect(s.state.memory).toBe(0);
    const checked = s.events.findIndex((event) => event.kind === "securityChecked");
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-081");
    expect(played).toBeGreaterThanOrEqual(0);
    expect(checked).toBeGreaterThanOrEqual(0);
    expect(played).toBeLessThan(checked);
    expect(
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("owen").permanentId,
      ),
    ).toBe(false);
  });
});
