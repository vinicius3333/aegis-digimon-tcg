import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-026.js";
import "../BT16/BT16-045.js";
import "../BT1/BT1-067.js";
import "../BT1/BT1-110.js";
import "../BT1/BT1-083.js";
import "../EX13/EX13-033.js";
import "../EX6/EX6-048.js";
import "../EX12/EX12-052.js";
import "../P/P-075.js";
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
            {
              kind: "Battle",
              optional: true,
              effectTextPart: "Then, this Digimon may battle 1 of your opponent's Digimon.",
            },
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
    expect(s.perm("source").currentDP).toBe(23000);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q5948: its Digivolving effect may suspend an opponent's Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "base" },
            { card: "EX11-062", as: "shoto" },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts: ["Unsuspend", "Battle"],
      },
    );
    preferred.push(s.inst("opponent").instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("base").currentDP).toBe(17000);
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
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX11-074")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([
      "[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may unsuspend.",
      "Then, this Digimon may battle 1 of your opponent's Digimon.",
    ]);
    assertNoLoudGap(s);
  });

  it("keeps the All Turns once-per-turn effect available after both optional actions are declined", async () => {
    const declinedPrompts = ["Unsuspend", "Battle"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-074", as: "source", dp: 14000, suspended: true },
            { card: "BT1-014", as: "firstTrigger" },
            { card: "BT1-014", as: "secondTrigger" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: declinedPrompts },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstTrigger").permanentId]);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    declinedPrompts.length = 0;
    await advance(s.engine).verb.suspend([s.perm("secondTrigger").permanentId]);

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
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

    preferInstanceIds.length = 0;
    preferInstanceIds.push(s.perm("source").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.hand.length === 0 &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-070"),
    );
    const suspendTargets = s.decisions.filter(
      ({ seat, req }) =>
        seat === 1 && req.sourceCardId === "BT1-070" && req.options?.candidateInstanceIds !== undefined,
    );
    expect(suspendTargets.at(-1)?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("source").permanentId, s.perm("ally").permanentId]),
    );
    expect(s.perm("source").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("allows its controller's Digimon effect to suspend it while the opponent-Digimon restriction is active", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "source" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
          hand: [
            { card: "EX11-074", as: "vortexdramon" },
            { card: "BT16-045", as: "ownSuspender" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("ally").instanceId);
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
    await settle(
      () => s.perm("ally").isSuspended && observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon"),
    );

    preferred.length = 0;
    preferred.push(s.perm("source").topCard!.instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ownSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.every(({ instanceId }) => instanceId !== s.inst("ownSuspender").instanceId) &&
        s.events.some(
          (event) =>
            event.kind === "effectTriggered" && event.sourceCardId === "EX11-074" && event.timing === "whenSuspended",
        ),
    );

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("ownSuspender").instanceId,
    );
    expect(s.perm("source").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    assertNoLoudGap(s);
  });

  it("allows an opponent Option effect to suspend the protected Vortexdramon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "source" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-067", as: "greenSource" }],
          hand: [{ card: "BT1-110", as: "flowerCannon" }],
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts: ["Unsuspend", "Battle"],
      },
    );
    preferred.push(s.inst("ally").instanceId);
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
    await settle(
      () => s.perm("ally").isSuspended && observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon"),
    );

    preferred.length = 0;
    preferred.push(s.perm("source").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT1-067");
    expect(s.state.turnSeat).toBe(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flowerCannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("flowerCannon").instanceId) &&
        s.events.some(
          (event) =>
            event.kind === "effectTriggered" && event.sourceCardId === "EX11-074" && event.timing === "whenSuspended",
        ),
    );
    const optionTargets = s.decisions.filter(
      ({ seat, req }) =>
        seat === 1 && req.sourceCardId === "BT1-110" && req.options?.candidateInstanceIds !== undefined,
    );
    expect(optionTargets.at(-1)?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("source").permanentId, s.perm("ally").permanentId]),
    );

    expect(s.perm("source").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("flowerCannon").instanceId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("retains an opponent-Digimon-granted effect while protected and deletes Vortex after protection lapses", async () => {
    const preferred: string[] = [];
    const declined: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "base" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-015", "BT1-016"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          hand: [
            { card: "EX6-048", as: "witchmon" },
            { card: "BT1-009", as: "witchCost" },
          ],
          security: ["BT1-017", "BT1-018"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts: declined,
      },
    );
    preferred.push(s.inst("ally").instanceId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").isSuspended);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(true);

    preferred.length = 0;
    preferred.push(s.perm("base").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("witchmon").instanceId) &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX6-048"),
    );
    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("witchCost").instanceId)).toBe(
      false,
    );
    const grantTargets = s.decisions.filter(
      ({ seat, req }) =>
        seat === 1 && req.sourceCardId === "EX6-048" && req.options?.candidateInstanceIds !== undefined,
    );
    expect(grantTargets.at(-1)?.req.options?.candidateInstanceIds).toContain(s.perm("base").permanentId);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    const vortexPermanentId = s.perm("base").permanentId;
    declined.push("Suspend", "Unsuspend", "Battle");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: vortexPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === vortexPermanentId));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("vortexdramon").instanceId)).toBe(
      true,
    );
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX6-048")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not resolve an opponent-granted When Suspended effect when an Option suspends protected Vortex", async () => {
    const preferred: string[] = [];
    const declinePrompts = ["Unsuspend", "Battle"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "base" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
            { card: "BT1-009", as: "unprotectedControl", dp: 3000 },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "P-075", as: "okuwamon" },
            { card: "BT1-067", as: "greenSource" },
          ],
          hand: [
            { card: "BT1-083", as: "granKuwagamon" },
            { card: "BT1-110", as: "flowerCannon" },
            { card: "BT1-110", as: "controlFlowerCannon" },
          ],
          security: ["BT1-015", "BT1-016"],
          deck: ["BT1-017", "BT1-018", "BT1-019", "BT1-020"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts,
      },
    );
    preferred.push(s.inst("ally").instanceId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("ally").isSuspended && observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon"),
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("okuwamon").permanentId,
        instanceId: s.inst("granKuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("okuwamon").topCard.cardId === "BT1-083" &&
        s.events.some((event) => event.kind === "effectTriggered" && event.timing === "whenOneOfYoursDigivolves"),
    );
    const grantEffectResolutions = s.events.filter(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "P-075",
    ).length;
    expect(grantEffectResolutions).toBeGreaterThan(0);
    preferred.length = 0;
    preferred.push(s.perm("base").permanentId);
    const memoryBeforeOption = s.state.memory;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flowerCannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("flowerCannon").instanceId),
    );

    expect(s.perm("base").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeOption - 2);
    expect(s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-075")).toHaveLength(
      grantEffectResolutions,
    );

    preferred.length = 0;
    preferred.push(s.perm("unprotectedControl").permanentId);
    const unprotectedTriggerCount = s.events.filter(
      (event) =>
        event.kind === "effectTriggered" && event.timing === "whenSuspended" && event.sourceCardId === "BT1-009",
    ).length;
    const memoryBeforeControlOption = s.state.memory;
    const controlFlowerCannonId = s.inst("controlFlowerCannon").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: controlFlowerCannonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("unprotectedControl").isSuspended &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === controlFlowerCannonId),
    );
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.timing === "whenSuspended" && event.sourceCardId === "BT1-009",
      ).length,
    ).toBeGreaterThan(unprotectedTriggerCount);
    expect(s.state.memory).not.toBe(memoryBeforeControlOption - 2);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("base").isSuspended).toBe(false);
    s.state.memory = 5;
    const vortexSuspensionTriggersBeforeAttack = s.events.filter(
      (event) =>
        event.kind === "effectTriggered" && event.timing === "whenSuspended" && event.sourceCardId === "EX11-074",
    ).length;
    declinePrompts.push("Suspend");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.timing === "whenSuspended" && event.sourceCardId === "EX11-074",
      ).length,
    ).toBeGreaterThan(vortexSuspensionTriggersBeforeAttack);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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

  it("Q5957: performs only one Piercing check when a direct battle and the attack battle each delete", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-074", as: "source", dp: 14000 },
            { card: "BT1-014", as: "ally" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "directVictim", dp: 3000, suspended: true },
            { card: "BT1-010", as: "attackVictim", dp: 4000, suspended: true },
          ],
          security: ["BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-014", "BT1-015", "BT1-016"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts: ["Suspend"],
      },
    );
    preferred.push(s.inst("directVictim").instanceId);
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attackVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("directVictim").instanceId, s.inst("attackVictim").instanceId]),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Q5958: retains Piercing from its direct battle when the ordinary attack target survives by Barrier", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-074", as: "source", dp: 14000 }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "directVictim", dp: 3000, suspended: true },
            { card: "EX13-033", as: "barrierTarget", dp: 13000, suspended: true },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts: ["Suspend"],
      },
    );
    preferred.push(s.inst("directVictim").instanceId);
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrierTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondBarrier",
        permanentId: s.perm("barrierTarget").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("directVictim").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("barrierTarget").permanentId,
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Q5956/Q5959: directly battles while protected, but does not Pierce during another Digimon's attack", async () => {
    const preferred: string[] = [];
    const declinePrompts = ["Battle"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "base" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally" },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "otherAttacker", dp: 3000 }],
          security: ["BT1-016", "BT1-017", "BT1-018"],
          deck: ["BT1-019", "BT1-020", "BT1-021", "BT1-022"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        declinePrompts,
      },
    );
    preferred.push(s.inst("ally").instanceId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("ally").isSuspended &&
        observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon") &&
        !s.perm("base").isSuspended,
    );
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);

    declinePrompts.length = 0;
    preferred.length = 0;
    preferred.push(s.perm("base").permanentId, s.perm("otherAttacker").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("otherAttacker").permanentId),
    );

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("otherAttacker").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("Q5956: an opponent's public Battle effect can choose protected Vortexdramon as its defender", async () => {
    const preferred: string[] = [];
    const declinePrompts = ["Battle"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-032", as: "base" },
            { card: "EX11-062", as: "shoto" },
            { card: "AD1-001", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "EX11-074", as: "vortexdramon" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "EX12-052", as: "attacker", dp: 12000 }],
          security: ["BT1-015", "BT1-016"],
          deck: ["BT1-017", "BT1-018", "BT1-019", "BT1-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred, declinePrompts },
    );
    preferred.push(s.inst("ally").instanceId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vortexdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("ally").isSuspended && observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon"),
    );
    expect(s.perm("base").currentDP).toBe(23000);
    declinePrompts.length = 0;

    preferred.length = 0;
    preferred.push(s.perm("base").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("attacker").instanceId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(observe(s.engine).hasRestriction(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("base").currentDP).toBe(26000);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("base").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("attacker").instanceId);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX12-052")).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
