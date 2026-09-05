import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-074.js";

describe("EX11-074 Vortexdramon", () => {
  it("preserves the printed level 7 Digimon and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-074")).toMatchObject({
      nameEn: "Vortexdramon",
      colors: ["Green"],
      level: 7,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Green", level: 6, memoryCost: 4 }],
      types: ["Bird Dragon", "Vortex Warriors", "LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(digivolutionRequirementsFor("EX11-074")).toEqual(compiled.digivolutionRequirement);
  });

  it("publishes the exact evolution, keywords, suspend windows, and All Turns OPT", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["GrandGalemon"],
        cost: 6,
        isAlternate: true,
        controllerControls: { kind: ["Digimon", "Tamer"], namesExact: ["Shoto Kazama"], min: 1 },
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toMatchObject([
      { keywords: [{ keyword: "Piercing" }] },
      { keywords: [{ keyword: "Vortex" }] },
      { keywords: [{ keyword: "Blocker" }] },
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        { kind: "Suspend", target: { filter: { controller: "any", kind: ["Digimon"] } }, optional: true },
        {
          kind: "Restrict",
          restriction: "beAffected",
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
          condition: { kind: "lastSuspendedIsMine" },
        },
        { kind: "ModifyDP", amount: 6000, condition: { kind: "lastSuspendedIsMine" } },
      ]);
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            { kind: "Unsuspend", optional: true },
            { kind: "Battle", optional: true },
          ],
        },
      ],
    });
  });

  it("takes the cost-6 [GrandGalemon] route while a [Shoto Kazama] Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "base" },
            { card: "EX11-062", as: "shoto" },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-074");

    expect(s.perm("base").topCard.cardId).toBe("EX11-074");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX11-032"]);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("refuses the alternate route without a [Shoto Kazama] on the board", async () => {
    // The Tamer is a `controllerControls` availability gate, not an evolution base: a level 5
    // GrandGalemon has no ordinary route into this level 7 card.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-032", as: "base" }],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("EX11-032");
    assertNoLoudGap(s);
  });

  it("refuses the alternate route from a level 5 base that is not [GrandGalemon]", async () => {
    // EX11-033 is the same colour and level as GrandGalemon and shares [LIBERATOR], and the
    // Shoto Kazama gate is satisfied — only `namesExact` separates the two bases. It has no
    // ordinary route into a level 7 card either, so nothing else can carry the digivolution.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-033", as: "base" },
            { card: "EX11-062", as: "shoto" },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("EX11-033");
    assertNoLoudGap(s);
  });

  it("Q5948-Q5954 rewards suspending your Digimon and filters opposing Digimon effects", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-074", as: "source", dp: 14000 },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("ally").instanceId);
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Vortex")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("ally").isSuspended);

    expect(s.perm("source").currentDP).toBe(20000);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(s.perm("source").permanentId, -2000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(20000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(s.perm("source").permanentId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(19000);
    assertNoLoudGap(s);
  });

  it("Q5955-Q5959 unsuspends and directly battles without making a security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-074", as: "source", dp: 14000, suspended: true },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const initialSecurity = s.state.players[1]!.security.length;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId], 0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(initialSecurity);
    assertNoLoudGap(s);
  });
});
