import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-053.js";
import "../index.js";

describe("BT25-053 Aegiochusmon: Green", () => {
  it("suspends an opponent Digimon and grants the <=3-security bonus", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("source").currentDP).toBe(13000);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
  });

  it("applies the unsuspend restriction to the chosen target even when it was already suspended (Q6329)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT25-046", as: "chosen", suspended: true },
            { card: "BT25-046", as: "other", suspended: true },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("chosen").permanentId, s.perm("other").permanentId]);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("keeps both entry timings and the inherited security-removal watcher", () => {
    const card = runtimeCompiledCard("BT25-053");
    expect(
      card?.effects.filter((effect) => effect.trigger === "Static").flatMap((effect) => effect.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Vortex" }),
        expect.objectContaining({ keyword: "Decode" }),
      ]),
    );
    expect(
      card?.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }],
    });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Green"], cost: 4, isAlternate: false },
      { level: 4, colors: ["Red"], cost: 4, isAlternate: false },
      { names: ["Aegiomon"], cost: 3, isAlternate: true },
    ]);
  });

  it("uses the named Aegiomon evolution route and resolves its When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-033", as: "aegiomon" }],
          hand: [{ card: "BT25-053", as: "green" }],
        },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aegiomon").permanentId,
        instanceId: s.inst("green").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aegiomon").topCard?.cardId === "BT25-053" && s.perm("target").isSuspended);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it.each([
    ["green", "BT1-069"],
    ["red", "BT1-019"],
  ])("evolves by the ordinary %s Lv4 route for cost 4", async (_color, sourceCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "source" }],
          hand: [{ card: "BT25-053", as: "card" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-053" && s.perm("target").isSuspended);
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("source").currentDP).toBe(13000);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
  });

  it("rejects a yellow Lv4 source from the ordinary routes", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "source" }], hand: [{ card: "BT25-053", as: "card" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("source").topCard?.cardId).toBe("BT1-051");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-053");
  });

  it("rejects the named alternate when the source is not Aegiomon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "source" }], hand: [{ card: "BT25-053", as: "card" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("card").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("source").topCard?.cardId).toBe("BT1-051");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-053");
  });

  it("keeps the security bonus off at four security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-053", as: "source" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("source").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(false);
  });

  it("can choose an opposing Tamer and applies the same suspension restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source" }] },
        1: { battleArea: [{ card: "BT1-089", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("tamer").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
  });

  it("inherits an optional once-per-turn reaction only to removal from its controller's security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-059", as: "host", under: ["BT25-053"] }] },
        1: {
          battleArea: [
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-089", as: "secondTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("firstTamer").isSuspended).toBe(false);
    expect(s.perm("secondTamer").isSuspended).toBe(false);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("firstTamer").isSuspended).toBe(true);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("secondTamer").isSuspended).toBe(false);
  });

  it("naturally suspends an opponent Digimon after an opponent security check removes your card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-059", as: "host", under: ["BT25-053"] }],
          security: [{ card: "BT1-090", as: "security" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 7000 },
            { card: "BT25-075", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("target").instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not react when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: ["BT25-053"] },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT25-075", as: "target" }], security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("runs the inherited removal watcher after a real security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-059", as: "host", under: ["BT25-053"] }],
          security: [{ card: "AD1-020", as: "security" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 7000 },
            { card: "BT25-075", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("target").instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    const securityEffect = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "AD1-020",
    );
    const inheritedReaction = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-053",
    );
    expect(securityEffect).toBeGreaterThanOrEqual(0);
    expect(inheritedReaction).toBeGreaterThan(securityEffect);
  });

  it("executes Decode from its own legal Aegiomon stack on an effect-caused leave", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "host", under: ["BT25-033"] }] },
        1: { battleArea: [{ card: "BT25-046", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-033"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-033")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-053");
  });

  it("can refuse Decode and then leaves the card normally", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-053", as: "host", under: ["BT25-033"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT25-053", "BT25-033"]),
    );
  });

  it("does not Decode a battle leave", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-053", as: "host", under: ["BT25-033"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT25-053", "BT25-033"]),
    );
  });

  it("does not Decode a non-Aegiomon card from its own stack", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-053", as: "host", under: ["BT1-069"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT25-053", "BT1-069"]),
    );
  });

  it("uses Vortex for a completed end-of-turn attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source", dp: 8000 }], deck: ["BT1-010"], hand: ["BT1-010"] },
        1: { battleArea: [{ card: "BT25-046", as: "target", dp: 3000 }], deck: ["BT1-011"], hand: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = true;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
