import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-088.js";
import "../BT26/BT26-067.js";

describe("BT6-088 Matt Ishida", () => {
  it("gains 1 memory and draws 1 when Gabumon moves from breeding", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-088", as: "matt" }],
        breeding: { card: "BT6-019", as: "gabumon" },
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("gabumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === 1 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-088", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-088")).toBe(true);
  });

  it("digivolves Gabumon into Bond of Friendship and trashes 2 security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-019", as: "gabumon" },
            { card: "BT6-088", as: "matt" },
          ],
          hand: [{ card: "BT6-030", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("gabumon").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("matt").topCard!.instanceId,
        effectKey: "BT6-088/main-digivolve-bond-of-friendship",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gabumon").topCard?.cardId === "BT6-030" &&
        s.state.players[0]!.security.length === 1 &&
        observe(s.engine).subscriptions("endOfTurn").length > 0,
    );

    expect(s.perm("gabumon").topCard?.cardId).toBe("BT6-030");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(2);

    const bondInstanceId = s.perm("gabumon").topCard.instanceId;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);
  });

  it("keeps the blue requirement while ignoring level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-069", as: "purpleGabumon" },
          { card: "BT6-088", as: "matt" },
        ],
        hand: [{ card: "BT6-030", as: "bond" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("matt").topCard.instanceId,
        effectKey: "BT6-088/main-digivolve-bond-of-friendship",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("requires exact Gabumon and does not activate for Gabumon X", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-020", as: "gabumonX" },
          { card: "BT6-088", as: "matt" },
        ],
        hand: [{ card: "BT6-030", as: "bond" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("matt").topCard.instanceId,
        effectKey: "BT6-088/main-digivolve-bond-of-friendship",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("excludes Gabumon X, exposes duplicate Bonds, and keeps the delayed deletion after Matt leaves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-019", as: "gabumon" },
          { card: "BT9-020", as: "gabumonX" },
          { card: "BT6-088", as: "matt" },
        ],
        hand: [
          { card: "BT6-030", as: "firstBond" },
          { card: "BT6-030", as: "secondBond" },
        ],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    const firstBondId = s.inst("firstBond").instanceId;
    const secondBondId = s.inst("secondBond").instanceId;
    const gabumonPermanentId = s.perm("gabumon").permanentId;
    const mattPermanentId = s.perm("matt").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("matt").topCard.instanceId,
        effectKey: "BT6-088/main-digivolve-bond-of-friendship",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const hostDecision = s.decisions.at(-1)!.req;
    expect(hostDecision.options?.candidateInstanceIds).toEqual([gabumonPermanentId]);
    expect(hostDecision.options?.candidateInstanceIds).not.toContain(s.perm("gabumonX").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [gabumonPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const bondDecision = s.decisions.at(-1)!.req;
    expect(new Set(bondDecision.options?.candidateInstanceIds)).toEqual(new Set([firstBondId, secondBondId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: bondDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [secondBondId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gabumon").topCard.instanceId === secondBondId &&
        observe(s.engine).subscriptions("endOfTurn").length === 1,
    );

    expect(await advance(s.engine).verb.deletePermanent([mattPermanentId], "byEffect")).toBe(1);
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondBondId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === firstBondId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === gabumonPermanentId)).toBe(false);
  });
});

describe("BT6-088 Matt Ishida — KB Q&A rulings", () => {
  const bondEffectKey = "BT6-088/main-digivolve-bond-of-friendship";

  type Setup = ReturnType<typeof setupEngine>;

  async function digivolveIntoBond(s: Setup, mattAlias: string, hostAlias: string, bondAlias: string): Promise<void> {
    const hostPermanentId = s.perm(hostAlias).permanentId;
    const bondInstanceId = s.inst(bondAlias).instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm(mattAlias).topCard.instanceId,
        effectKey: bondEffectKey,
      }),
    ).toEqual({ ok: true });

    const hostIsBond = (): boolean =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.permanentId === hostPermanentId && permanent.topCard.instanceId === bondInstanceId,
      );
    for (let answered = 0; answered < 4 && !hostIsBond(); answered += 1) {
      await settle(() => hostIsBond() || s.state.pendingDecision !== undefined);
      if (s.state.pendingDecision === undefined) break;
      const request = s.decisions.at(-1)!.req;
      const response =
        request.kind === "chooseTargets"
          ? { kind: "chooseTargets" as const, instanceIds: [hostPermanentId] }
          : { kind: "selectCards" as const, instanceIds: [bondInstanceId] };
      expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: request.decisionId, response })).toEqual({
        ok: true,
      });
    }
    await settle(() => hostIsBond() && s.state.pendingDecision === undefined);
  }

  it("can activate [Main] with 1 or fewer security cards and trashes as many as it can (Q1476)", async () => {
    async function activateWithSecurity(securityCount: number) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT6-019", as: "gabumon" },
            { card: "BT6-088", as: "matt" },
          ],
          hand: [{ card: "BT6-030", as: "bond" }],
          security: Array.from({ length: securityCount }, (_, index) => ({
            card: "BT1-001",
            as: `security${index}`,
          })),
        },
      });
      s.state.memory = 5;
      await s.ready();
      const securityInstanceIds = s.state.players[0]!.security.map((card) => card.instanceId);

      await digivolveIntoBond(s, "matt", "gabumon", "bond");

      const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
      return {
        hostCardId: s.perm("gabumon").topCard.cardId,
        remainingSecurity: s.state.players[0]!.security.length,
        allSecurityTrashed: securityInstanceIds.every((instanceId) => trashIds.includes(instanceId)),
        armedDeletions: observe(s.engine).subscriptions("endOfTurn").length,
      };
    }

    for (const securityCount of [1, 0]) {
      const result = await activateWithSecurity(securityCount);
      expect(result.hostCardId).toBe("BT6-030");
      expect(result.remainingSecurity).toBe(0);
      expect(result.allSecurityTrashed).toBe(true);
      expect(result.armedDeletions).toBe(0);
    }
  });

  it("still deletes Bond of Friendship when security had cards at resolution even if it empties later (Q1477)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-019", as: "gabumon" },
          { card: "BT6-088", as: "matt" },
        ],
        hand: [{ card: "BT6-030", as: "bond" }],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    const hostPermanentId = s.perm("gabumon").permanentId;
    await digivolveIntoBond(s, "matt", "gabumon", "bond");
    expect(s.state.players[0]!.security).toHaveLength(1);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.security).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bond").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostPermanentId)).toBe(false);
  });

  it("deletes only the Bond digivolved while security had cards when two Matts are used (Q1478)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-019", as: "firstGabumon" },
          { card: "BT6-019", as: "secondGabumon" },
          { card: "BT6-088", as: "firstMatt" },
          { card: "BT6-088", as: "secondMatt" },
        ],
        hand: [
          { card: "BT6-030", as: "firstBond" },
          { card: "BT6-030", as: "secondBond" },
        ],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    const firstHostId = s.perm("firstGabumon").permanentId;
    const secondHostId = s.perm("secondGabumon").permanentId;
    s.state.memory = 8;
    await s.ready();

    await digivolveIntoBond(s, "firstMatt", "firstGabumon", "firstBond");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).subscriptions("endOfTurn")).toHaveLength(1);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.security).toHaveLength(0);

    await digivolveIntoBond(s, "secondMatt", "secondGabumon", "secondBond");
    expect(observe(s.engine).subscriptions("endOfTurn")).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstBond").instanceId));

    const battleArea = s.state.players[0]!.battleArea;
    expect(battleArea.some((permanent) => permanent.permanentId === firstHostId)).toBe(false);
    expect(battleArea.find((permanent) => permanent.permanentId === secondHostId)?.topCard.instanceId).toBe(
      s.inst("secondBond").instanceId,
    );
  });

  it("deletes the digivolved Digimon at the end of the same turn it digivolved (Q5526)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-019", as: "gabumon" },
          { card: "BT6-088", as: "matt" },
        ],
        hand: [{ card: "BT6-030", as: "bond" }],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    const hostPermanentId = s.perm("gabumon").permanentId;
    const bondInstanceId = s.inst("bond").instanceId;
    s.state.memory = 5;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await digivolveIntoBond(s, "matt", "gabumon", "bond");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostPermanentId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);
  });

  it("lets the turn player order the end-of-turn deletion against another end-of-turn effect (Q5527)", async () => {
    async function endTurnWithFirstTrigger(firstTrigger: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT6-019", as: "gabumon" },
              { card: "BT6-088", as: "matt" },
              { card: "BT26-067", as: "wizardmon" },
            ],
            hand: [{ card: "BT6-030", as: "bond" }],
            security: ["BT1-001", "BT1-002", "BT1-003"],
          },
        },
        { preferTriggerKeys: [firstTrigger] },
      );
      s.state.memory = 5;

      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await digivolveIntoBond(s, "matt", "gabumon", "bond");
      advance(s.engine).endMainPhaseIfOpen(0);

      // Wizardmon needs a blue Digimon, so its prompt appears only if it resolves before the Bond is deleted.
      const wizardmonOffered = (): boolean =>
        s.decisions.some(
          ({ req }) => req.kind === "optional" && req.sourceInstanceId === s.inst("wizardmon").instanceId,
        );
      await settle(() => wizardmonOffered() || s.state.players[0]!.trash.some((c) => c.cardId === "BT6-030"));
      if (s.state.pendingDecision?.kind === "optional") {
        const request = s.decisions.at(-1)!.req;
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "optional", accept: false },
        });
      }
      await turn;

      const orderRequest = s.decisions.find(({ req }) => req.kind === "orderTriggers");
      return {
        orderedCardIds: orderRequest?.req.options?.triggerCardIds ?? [],
        orderedBy: orderRequest?.seat,
        wizardmonOffered: wizardmonOffered(),
        bondDeleted: s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bond").instanceId),
      };
    }

    const deletionFirst = await endTurnWithFirstTrigger("BT6-088");
    expect(deletionFirst.orderedBy).toBe(0);
    expect(deletionFirst.orderedCardIds).toEqual(expect.arrayContaining(["BT6-088", "BT26-067"]));
    expect(deletionFirst.bondDeleted).toBe(true);
    expect(deletionFirst.wizardmonOffered).toBe(false);

    const wizardmonFirst = await endTurnWithFirstTrigger("BT26-067");
    expect(wizardmonFirst.orderedCardIds).toEqual(expect.arrayContaining(["BT6-088", "BT26-067"]));
    expect(wizardmonFirst.bondDeleted).toBe(true);
    expect(wizardmonFirst.wizardmonOffered).toBe(true);
  });
});
