import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-026.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-074.js";
import "./EX11-062.js";

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
            { card: "EX11-032", as: "source" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-020", "BT1-021", "BT1-022"],
          deck: ["BT1-009", "BT1-013", "BT1-019"],
        },
        1: { deck: ["BT1-009", "BT1-013", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("ally").instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").isSuspended);

    expect(s.perm("source").topCard.cardId).toBe("EX11-074");
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Vortex")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    // Shoto remains on the board after the required alternate evolution and grants this
    // Vortex Warriors Digimon an additional +3000 DP, so the printed +6000 resolves to 23000.
    expect(s.perm("source").currentDP).toBe(23000);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q5955-Q5959 unsuspends and directly battles without making a security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-074", as: "source", dp: 14000, suspended: true }], deck: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-080", as: "opponent", dp: 3000 }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const initialSecurity = s.state.players[1]!.security.length;

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(initialSecurity);
    assertNoLoudGap(s);
  });

  it("Q5949-Q5954 blocks a public opponent Digimon effect from suspending the protected Vortex", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "source" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-020", "BT1-021", "BT1-022"],
        },
        1: { hand: [{ card: "BT1-070", as: "suspender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("ally").instanceId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").isSuspended);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 0);
    expect(s.perm("source").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("resets the All Turns watcher after two public producer suspensions", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-074", as: "source", dp: 14000 }],
          hand: [
            { card: "EX11-026", as: "producerA" },
            { card: "EX11-026", as: "producerB" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "attackerA", dp: 3000 },
            { card: "BT1-081", as: "attackerB", dp: 3000 },
          ],
          security: ["BT1-019", "BT1-020", "BT1-021", "BT1-022"],
          deck: ["BT1-023", "BT1-024", "BT1-025", "BT1-026", "BT1-027", "BT1-028"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").permanentId, s.perm("attackerA").permanentId);
    const optional = async (seat: 0 | 1, accept: boolean) => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const id = s.state.pendingDecision!.decisionId;
      expect(
        s.engine.applyIntent(seat, { type: "respondDecision", decisionId: id, response: { kind: "optional", accept } }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
    };
    const resolveTurnEntry = async () => {
      await settle(() => s.state.pendingDecision !== undefined);
      if (s.state.pendingDecision?.kind === "optional") await optional(s.state.pendingDecision.seat as 0 | 1, false);
    };
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producerA").instanceId })).toEqual({
      ok: true,
    });
    await optional(0, true);
    await settle(() => s.perm("source").isSuspended);
    await optional(0, false);
    expect(s.perm("source").isSuspended).toBe(true);
    await optional(0, false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await resolveTurnEntry();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await optional(0, true);
    await optional(0, true);
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-080"));
    expect(s.perm("source").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producerB").instanceId })).toEqual({
      ok: true,
    });
    await optional(0, true);
    await settle(() => s.perm("source").isSuspended);
    await optional(0, false);
    await optional(0, false);
    expect(s.perm("source").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await resolveTurnEntry();
    await advance(s.engine).waitForMainPhase(1);
    preferred.push(s.perm("attackerB").permanentId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await optional(0, true);
    await optional(0, true);
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-081"));
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("performs one Piercing security check when its attack deletes an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-074", as: "source", dp: 14000 }], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", suspended: true, dp: 3000 }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-009", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
