import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-054.js";

describe("EX11-054 Owen Dreadnought", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-054")).toMatchObject({
      nameEn: "Owen Dreadnought",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends to draw and boosts only a Progress Digimon when a Reptile is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT1-010", as: "reptile" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("progress").currentDP === 10000, 600);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("progress").currentDP).toBe(10000);
    assertNoLoudGap(s);
  });

  it("leaves Owen unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT1-010", as: "reptile" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 60);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("owen").isSuspended).toBe(false);
    // The Reptile left the hand, and no <Draw 1> replaced it.
    expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-054", as: "owen" }] } });
    s.state.memory = 2;

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartTurn, s.perm("owen"));

    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX11-054", as: "owen" }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("owen"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-054"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-054")).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes exact Reptile/Dragonkin watchers and full compiled coverage", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenPlayed", sourceFilter: expect.any(Object) }),
        expect.objectContaining({ event: "whenOneOfYoursDigivolves", sourceFilter: expect.any(Object) }),
      ]),
    );
    for (const action of allTurns?.actions ?? []) {
      if (action.kind !== "SubTrigger") continue;
      expect(action.sourceFilter).toMatchObject({
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { match: "trait", tokens: ["Reptile"] },
          { match: "trait", tokens: ["Dragonkin"], orPrevious: true },
        ],
      });
      expect(action.actions).toMatchObject([
        { kind: "Draw", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "ModifyDP", target: { filter: { keywords: ["Progress"] } }, amount: 3000 },
      ]);
    }
  });
});
