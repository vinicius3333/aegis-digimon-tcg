import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, type DecisionRequest, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-038.js";

function scriptTargets(s: EngineSetup, picks: string[][]) {
  const answered = new Set<string>();
  const seen: { candidates: string[]; picked: string[] }[] = [];
  let next = 0;
  return {
    seen,
    drive(): void {
      for (const { seat, req } of s.decisions as { seat: Seat; req: DecisionRequest }[]) {
        if (req.kind !== "chooseTargets" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        const candidates = req.options?.candidateInstanceIds ?? [];
        const wanted = picks[next] ?? [];
        next += 1;
        const instanceIds = candidates.filter((id) => wanted.includes(id));
        seen.push({ candidates, picked: instanceIds });
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "chooseTargets", instanceIds },
        });
      }
    },
  };
}

function idsOf(s: EngineSetup, alias: string): string[] {
  const permanent = s.perm(alias);
  return [permanent.permanentId, permanent.topCard!.instanceId];
}

describe("BT19-038 JaegerDorulumon", () => {
  it("matches the catalog printing this audit reads from", () => {
    expect(getCardDefinition("BT19-038")).toMatchObject({
      cardId: "BT19-038",
      nameEn: "JaegerDorulumon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Beastkin", "Xros Heart"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      inheritedEffectText: "[Your Turn] This Digimon with the [Xros Heart]\u00a0trait gains ＜Piercing＞.",
    });
    const printed = getCardDefinition("BT19-038")!.effectText!;
    expect(printed).toContain("[Digivolve]Lv.4 w/[Xros Heart]\u00a0trait: Cost 3");
    expect(printed).toContain("This card is also treated as [Dorulumon] for a DigiXros.");
    expect(printed).toContain(
      "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, 1 of their Digimon can't activate [When Digivolving] effects or unsuspend until the end of their turn.",
    );
    expect(printed).toContain(
      "[On Deletion] You may place 1 Digimon card with the [Xros Heart]/[Blue Flare]\u00a0trait from your hand or trash under any of your Tamers.",
    );
    expect(digivolutionRequirementsFor("BT19-038")).toEqual([
      { level: 4, traits: ["Xros Heart"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves for 3 from an off-color Lv.4 with the [Xros Heart] trait, which no printed evoCost allows", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-063", as: "source" }],
        hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT1-013" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const jaegerId = s.inst("jaeger").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: jaegerId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === jaegerId));

    expect(
      s.events.some((event) => event.kind === "digivolved" && "mechanic" in event && event.mechanic === "alternate"),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.perm("jaeger").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("refuses an illegal source and charges the full 4 when the alternate route does not apply", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "illegal" },
          { card: "BT10-033", as: "nearMiss" },
        ],
        hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT19-038", as: "jaegerTwo" }, { card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 4;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("illegal").permanentId,
          instanceId: s.inst("jaeger").instanceId,
          ...(useAlternateCost ? { useAlternateCost } : {}),
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.perm("illegal").topCard?.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(4);

    const jaegerTwoId = s.inst("jaegerTwo").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nearMiss").permanentId,
        instanceId: s.inst("jaegerTwo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === jaegerTwoId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("counts as [Dorulumon] for a DigiXros, where a peer without the alias is refused (Q3094)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-010", as: "x4" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT19-038", as: "jaeger" },
          { card: "BT19-039", as: "noAlias" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("noAlias").instanceId],
          expanderPermanentIds: [],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("jaeger").instanceId],
          expanderPermanentIds: [],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010"));

    expect(
      s
        .perm("x4")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("shoutmon").instanceId, s.inst("jaeger").instanceId].sort());
    expect(s.state.memory).toBe(0);
  });

  it("is not [Dorulumon] outside a DigiXros: ＜Material Save＞ saves the real Dorulumon only (Q3094)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-013", as: "x5", under: ["BT19-038", "BT19-033"] },
            { card: "ST3-12", as: "tamer" },
          ],
          hand: [{ card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", dp: 15_000, suspended: true }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const jaegerId = s.perm("x5").stack.find((card) => card.cardId === "BT19-038")!.instanceId;
    const dorulumonId = s.perm("x5").stack.find((card) => card.cardId === "BT19-033")!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([dorulumonId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(jaegerId);
  });

  it("suspends one opponent Digimon and locks a DIFFERENT one, never touching my own board", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "mine" }],
        hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "victim" },
          { card: "BT1-011", as: "locked" },
        ],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "victim"), idsOf(s, "locked")]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jaeger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      script.drive();
      return s.perm("victim").isSuspended && observe(s.engine).isRestricted(s.perm("locked"), "unsuspend");
    });

    expect(s.state.memory).toBe(3);
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("locked").isSuspended).toBe(false);
    expect(s.perm("mine").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("mine"), "unsuspend")).toBe(false);
    const mineIds = idsOf(s, "mine");
    for (const { candidates } of script.seen) {
      expect(candidates.some((id) => mineIds.includes(id))).toBe(false);
    }
    expect(script.seen).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may choose an ALREADY suspended Digimon for the suspension", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "already", suspended: true },
          { card: "BT1-011", as: "fresh" },
        ],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "already"), idsOf(s, "fresh")]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jaeger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      script.drive();
      return observe(s.engine).isRestricted(s.perm("fresh"), "unsuspend");
    });

    const alreadyIds = idsOf(s, "already");
    expect(script.seen[0]!.candidates.some((id) => alreadyIds.includes(id))).toBe(true);
    expect(script.seen[0]!.picked).toHaveLength(1);
    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the locked Digimon suspended through the opponent's unsuspend phase, then releases it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-063", as: "source" }],
        hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "locked", suspended: true },
          { card: "BT1-011", as: "peer", suspended: true },
        ],
        hand: [{ card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "locked"), idsOf(s, "locked")]);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("jaeger").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive();
      return observe(s.engine).isRestricted(s.perm("locked"), "unsuspend");
    });
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(s.perm("peer").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("locked").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stops a locked Digimon's [When Digivolving] effect and its 'by' condition (Q5541, Q5544)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-063", as: "source" },
            { card: "BT1-051", as: "prey" },
          ],
          hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-051", as: "locked" },
            { card: "BT3-037", as: "free" },
          ],
          hand: [{ card: "BT19-039", as: "skull" }, { card: "BT19-039", as: "skullTwo" }, { card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: [
            { card: "BT1-009", as: "oppSecTop" },
            { card: "BT1-010", as: "oppSecSecond" },
            { card: "BT1-011", as: "oppSecThird" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "free"), idsOf(s, "locked")]);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("jaeger").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive();
      return observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving");
    });
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    const skullId = s.inst("skull").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === skullId));

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("oppSecTop").instanceId,
      s.inst("oppSecSecond").instanceId,
      s.inst("oppSecThird").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT19-038", "BT1-051"].sort(),
    );

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("free").permanentId,
        instanceId: s.inst("skullTwo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("oppSecTop").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-038"]);

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still lets a locked Digimon's [When Attacking] half of a shared clause activate (Q5542, Q5545)", async () => {
    const trashPile = Array.from({ length: 10 }, () => "BT1-009");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-063", as: "source" }],
          hand: [{ card: "BT19-038", as: "jaeger" }, { card: "BT1-013" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT2-075", as: "locked" },
            { card: "BT1-013", as: "decoy" },
          ],
          hand: [{ card: "BT14-080", as: "ghoulmon" }, { card: "BT1-013" }],
          trash: trashPile,
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "decoy"), idsOf(s, "locked")]);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("jaeger").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive();
      return observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving");
    });
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    const ghoulmonId = s.inst("ghoulmon").instanceId;
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: ghoulmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghoulmonId),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("ghoulmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === deckBefore.length - 3);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore.slice(3));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(deckBefore.slice(0, 3)),
    );

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Deletion] places a matching hand card under a CHOSEN Tamer and never the near-miss peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-038", as: "jaeger" },
            { card: "ST3-12", as: "tamerOne" },
            { card: "BT2-087", as: "tamerTwo" },
          ],
          hand: [
            { card: "BT19-033", as: "xrosHeart" },
            { card: "BT1-051", as: "nearMiss" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", dp: 12_000, suspended: true }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "tamerTwo")]);
    const answeredSelects = new Set<string>();
    const driveSelects = (): void => {
      for (const { seat, req } of s.decisions as { seat: Seat; req: DecisionRequest }[]) {
        if (req.kind !== "selectCards" || answeredSelects.has(req.decisionId)) continue;
        answeredSelects.add(req.decisionId);
        const candidates = req.options?.candidateInstanceIds ?? [];
        expect(candidates).not.toContain(s.inst("nearMiss").instanceId);
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: candidates.slice(0, 1) },
        });
      }
    };

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jaeger").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive();
      driveSelects();
      return s.perm("tamerTwo").stack.length === 1 || s.perm("tamerOne").stack.length === 1;
    });

    expect(s.perm("tamerTwo").stack.map((card) => card.cardId)).toEqual(["BT19-033"]);
    expect(s.perm("tamerOne").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-038"]);
  });

  it("[On Deletion] also reaches a [Blue Flare] card in the trash, and may be declined", async () => {
    const board = (): BoardSpec => ({
      0: {
        battleArea: [
          { card: "BT19-038", as: "jaeger" },
          { card: "ST3-12", as: "tamer" },
        ],
        trash: [{ card: "BT19-016", as: "blueFlare" }],
        hand: [{ card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-024", as: "wall", dp: 12_000, suspended: true }],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
    });

    const accepted = setupEngine(board(), { autoAcceptOptional: true, autoSelectCards: true });
    accepted.state.memory = 3;
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: accepted.perm("jaeger").permanentId,
        target: { kind: "permanent", permanentId: accepted.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.perm("tamer").stack.length === 1);
    expect(accepted.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      accepted.inst("blueFlare").instanceId,
    ]);
    expect(accepted.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-038"]);

    const declined = setupEngine(board(), { autoDeclineOptional: true, autoSelectCards: true });
    declined.state.memory = 3;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("jaeger").permanentId,
        target: { kind: "permanent", permanentId: declined.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[0]!.battleArea.length === 1);
    expect(declined.perm("tamer").stack).toHaveLength(0);
    expect(declined.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-016", "BT19-038"]);
  });

  it("inherited ＜Piercing＞ reaches security only under an [Xros Heart] host, on that host's own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-010", as: "xrosHost", under: ["BT19-038"] },
          { card: "BT19-039", as: "plainHost", under: ["BT19-038"] },
        ],
        hand: [{ card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "prey", suspended: true },
          { card: "BT1-013", as: "preyTwo", suspended: true },
        ],
        hand: [{ card: "BT1-013" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("xrosHost"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("plainHost"))).toBe(false);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("xrosHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plainHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("preyTwo").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasPierce(s.perm("xrosHost"))).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
