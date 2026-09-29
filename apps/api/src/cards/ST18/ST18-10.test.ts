import { describe, expect, it } from "vitest";
import { type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ST18-10.js";

describe("ST18-10 GrandGalemon", () => {
  it("suspends a Digimon and, when it suspends yours, plays a qualifying Bird from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST18-10", as: "grandgalemon" },
            { card: "ST18-03", as: "bird" },
          ],
          battleArea: [{ card: "ST18-03", as: "ownTarget" }],
        },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grandgalemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ownTarget").isSuspended);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId),
    );

    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId)).toBe(
      true,
    );
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
  });

  it("resolves the same suspend and conditional play through When Digivolving", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-08", as: "base" },
            { card: "ST18-03", as: "ownTarget" },
          ],
          hand: [
            { card: "ST18-10", as: "grandgalemon" },
            { card: "ST18-03", as: "bird" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 4;
    preferInstanceIds.push(s.perm("ownTarget").permanentId, s.perm("ownTarget").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grandgalemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownTarget").isSuspended);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId),
    );
    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId)).toBe(
      true,
    );
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
  });

  it("accepts the inherited optional unsuspend when ST18-10 is underneath the host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST18-12", as: "host", under: ["ST18-10"] }] },
      1: { battleArea: [{ card: "ST18-03", as: "target", suspended: true }], security: ["BT1-011"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)?.req.kind).toBe("optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("may decline the inherited unsuspend on the first attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-12", as: "host", under: ["ST18-10"] }] },
        1: { battleArea: [{ card: "ST18-03", as: "target", suspended: true }], security: ["BT1-011"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("can attack again after inherited unsuspend, while the once-per-turn effect stays spent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-12", as: "host", under: ["ST18-10"] }] },
        1: { battleArea: [{ card: "ST18-03", as: "target", suspended: true }], security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publishes the inherited once-per-turn unsuspend effect", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenAttacking" })],
      }),
    );
  });
});

describe("ST18-10 GrandGalemon — KB Q&A rulings", () => {
  function offeredTargetPermanentIds(s: EngineSetup): string[] {
    const permanents = [...s.state.players[0]!.battleArea, ...s.state.players[1]!.battleArea];
    return s.decisions
      .filter(({ seat, req }) => seat === 0 && req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])
      .map(
        (id) =>
          permanents.find((perm) => perm.permanentId === id || perm.topCard?.instanceId === id)?.permanentId ?? id,
      );
  }

  async function playGrandGalemonSuspending(ownTargetSuspended: boolean, target: "own" | "opponent" = "own") {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST18-10", as: "grandgalemon" },
            { card: "ST18-03", as: "bird" },
          ],
          battleArea: [{ card: "ST18-03", as: "ownTarget", suspended: ownTargetSuspended }],
        },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 7;
    const preferred = s.perm(target === "own" ? "ownTarget" : "opponentTarget");
    preferInstanceIds.push(preferred.permanentId, preferred.topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grandgalemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.events.some(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "ST18-10" && event.timing === "OnPlay",
      ),
    );
    return s;
  }

  function birdWasPlayed(s: EngineSetup): boolean {
    return s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("bird").instanceId);
  }

  it("may target and suspend your own Digimon because the effect names no player (Q844)", async () => {
    const s = await playGrandGalemonSuspending(false);

    expect(offeredTargetPermanentIds(s)).toEqual(
      expect.arrayContaining([s.perm("ownTarget").permanentId, s.perm("opponentTarget").permanentId]),
    );
    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
    expect(birdWasPlayed(s)).toBe(true);
  });

  it("does not count an already suspended Digimon of yours as suspended by the effect (Q845)", async () => {
    const s = await playGrandGalemonSuspending(true);

    expect(offeredTargetPermanentIds(s)).toContain(s.perm("ownTarget").permanentId);
    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
    expect(birdWasPlayed(s)).toBe(false);
    expect(Array.from(s.state.players[0]!.hand).map((card) => card.instanceId)).toContain(s.inst("bird").instanceId);
  });

  it("plays no Digimon when the effect suspends only an opponent's Digimon", async () => {
    const s = await playGrandGalemonSuspending(false, "opponent");

    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
    expect(birdWasPlayed(s)).toBe(false);
  });

  it("does not trigger the inherited unsuspend when <Raid> switches an attack on the player to a Digimon (Q846)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-091", as: "raider", under: ["ST18-10"] }] },
        1: { battleArea: [{ card: "ST18-03", as: "defender" }], security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("raider").isSuspended).toBe(true);
  });
});
