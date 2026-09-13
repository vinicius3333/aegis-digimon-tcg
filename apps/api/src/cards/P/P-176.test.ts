import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-176.js";

describe("P-176 Dorimon", () => {
  it("encodes the inherited once-per-turn optional Chronicle digivolution from hand", () => {
    const effect = runtimeCompiledCard("P-176")!.effects.find((entry) => entry.trigger === "WhenAttacking")!;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          optional: true,
          from: ["hand"],
          target: { isSelf: true, count: 1, filter: { isSelfRef: true } },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("keeps the optional inherited evolution inactive when no Chronicle card is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-058", as: "host", under: ["P-176"] }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: { security: ["BT10-090", "BT10-090", "BT10-090"], deck: Array.from({ length: 20 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("host").topCard.cardId).toBe("BT10-058");
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves a level-three host into Chronicle cards once per turn and after reset", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-058", as: "host", under: ["P-176"] }],
          hand: [
            { card: "BT20-012", as: "chronicle1" },
            { card: "BT20-012", as: "chronicle2" },
            { card: "BT20-012", as: "chronicle3" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          security: ["BT10-090", "BT10-090", "BT10-090"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const originalBaseId = s.perm("host").topCard.instanceId;
    const hostSourceId = s.perm("host").stack.find((card) => card.cardId === "P-176")!.instanceId;
    const chronicle1Id = s.inst("chronicle1").instanceId;
    const chronicle2Id = s.inst("chronicle2").instanceId;
    const chronicle3Id = s.inst("chronicle3").instanceId;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostId = s.perm("host").permanentId;
    const resolveFirstEvolution = async () => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const first = s.decisions.at(-1)!.req;
      expect(first.sourceCardId).toBe("P-176");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: first.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision?.kind === "optional" ||
          (!observe(s.engine).isAttacking() && s.state.pendingDecision === undefined),
      );
      if (s.state.pendingDecision?.kind !== "optional") return;
      const nested = s.decisions.at(-1)!.req;
      expect(nested.sourceCardId).toBe("BT20-012");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: nested.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    };
    const attack = async (shouldEvolve: boolean) => {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      if (shouldEvolve) await resolveFirstEvolution();
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.perm("host").isSuspended).toBe(true);
      return s.perm("host").topCard.instanceId;
    };
    const firstEvolvedId = await attack(true);
    expect([chronicle1Id, chronicle2Id, chronicle3Id]).toContain(firstEvolvedId);
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").stack.some((card) => card.instanceId === originalBaseId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === hostSourceId)).toBe(true);
    await (
      s.engine as unknown as { primitives: { deDigivolve(permanentId: string, count: number): Promise<void> } }
    ).primitives.deDigivolve(hostId, 1);
    expect(s.perm("host").topCard.instanceId).toBe(originalBaseId);
    await advance(s.engine).verb.unsuspend([hostId]);
    await attack(false);
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").topCard.cardId).toBe("BT10-058");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const thirdEvolvedId = await attack(true);
    expect(s.state.memory).toBe(0);
    expect([chronicle1Id, chronicle2Id, chronicle3Id]).toContain(thirdEvolvedId);
    expect(thirdEvolvedId).not.toBe(firstEvolvedId);
    expect(s.perm("host").stack.some((card) => card.instanceId === hostSourceId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === originalBaseId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
