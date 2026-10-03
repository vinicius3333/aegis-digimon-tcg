import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { deepStrictEqual, ok } from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_059 } from "./BT25-059.js";
import "../index.js";

describe("BT25-059 Ceresmon", () => {
  it("matches every catalog surface and maps all printed clauses", () => {
    expect(getCardDefinition("BT25-059")).toMatchObject({
      nameEn: "Ceresmon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman", "Olympos XII", "Iliad", "TS", "Vegetation"],
      effectText: expect.stringContaining("2 or more suspended Digimon"),
      dualEffect: "Ceresmon",
    });
    expect(BT25_059.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static" }),
        expect.objectContaining({ trigger: "OnPlay" }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn" }),
      ]),
    );
    expect(BT25_059.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Green"], cost: 4, isAlternate: false },
      { level: 5, colors: ["Yellow"], cost: 4, isAlternate: false },
      { level: 5, traits: ["Vegetation", "TS"], cost: 3, isAlternate: true },
    ]);
    expect(BT25_059.effects?.flatMap((effect) => effect.keywords ?? [])).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_059.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 2, upTo: true },
        optional: true,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], trait: ["Vegetation", "TS"], suspended: true },
          count: "all",
        },
        restriction: "beAffected",
        fromSourceKind: ["Digimon"],
        byOpponentEffectsOnly: true,
        whileMatchesTargetFilter: true,
        duration: "untilOpponentTurnEnd",
      });
      expect(effect?.actions?.[1]?.optional).toBeUndefined();
    }
    const allTurns = BT25_059.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      actions: [
        {
          kind: "ModifyDP",
          amount: -3000,
          duration: "untilOpponentTurnEnd",
          scaling: {
            per: 1,
            unit: "cards",
            filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
          },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("reduces the exact 12-cost play to 7 with two suspended Digimon, but not with one", async () => {
    const reduced = setupEngine(
      {
        0: { hand: [{ card: "BT25-059", as: "ceresmon" }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "suspendedOne", suspended: true },
            { card: "BT1-013", as: "suspendedTwo", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    reduced.state.memory = 7;
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("ceresmon").instanceId }),
    ).toEqual({
      ok: true,
    });
    const reducedPermanent = () => reduced.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-059");
    await settle(() => reducedPermanent()?.topCard?.cardId === "BT25-059");
    expect(reduced.state.memory).toBe(0);

    const noReduction = setupEngine({
      0: { hand: [{ card: "BT25-059", as: "ceresmon" }] },
      1: { battleArea: [{ card: "BT1-013", as: "onlySuspended", suspended: true }] },
    });
    noReduction.state.memory = 7;
    expect(
      noReduction.engine.applyIntent(0, { type: "playCard", instanceId: noReduction.inst("ceresmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => noReduction.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-059"));
    expect(noReduction.state.memory).toBe(-5);
  });

  it("On Play suspends up to two Digimon from either side, then protects all own suspended TS/Vegetation Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-059", as: "ceresmon" }],
          battleArea: [
            { card: "BT25-062", as: "ownTs" },
            { card: "BT1-013", as: "ownOther" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "opponent", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownTs").permanentId, s.perm("opponent").permanentId);
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceresmon").instanceId })).toEqual({
      ok: true,
    });
    const playedPermanent = () => s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-059")!;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-059"));
    await settle(() => observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon"));

    expect(s.perm("ownTs").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("ownOther"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).hasKeyword(playedPermanent(), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(playedPermanent(), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(playedPermanent(), "Fortitude")).toBe(false);
  });

  it("When Digivolving grants the same protection even when the optional suspend is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-053", as: "vegetationBase" },
            { card: "BT25-062", as: "ownTs", suspended: true },
          ],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vegetationBase").permanentId,
        instanceId: s.inst("ceresmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon"));

    expect(s.perm("vegetationBase").topCard.cardId).toBe("BT25-059");
    expect(s.perm("ownTs").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon")).toBe(true);
  });

  it.each([
    ["green", "BT1-075"],
    ["yellow", "BT11-041"],
  ] as const)("uses the ordinary %s Lv.5 evolution at cost 4", async (_color, source) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: source, as: "source" }], hand: [{ card: "BT25-059", as: "ceresmon" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("ceresmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-059");
    expect(s.state.memory).toBe(0);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([source]);
  });

  it("uses the Vegetation/TS alternate at cost 3 and rejects a red non-trait Lv.5", async () => {
    const alternate = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "tsBase" }], hand: [{ card: "BT25-059", as: "ceresmon" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    alternate.state.memory = 3;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("tsBase").permanentId,
        instanceId: alternate.inst("ceresmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("tsBase").topCard?.cardId === "BT25-059");
    expect(alternate.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "redBase" }], hand: [{ card: "BT25-059", as: "ceresmon" }] },
    });
    invalid.state.memory = 4;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("ceresmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.perm("redBase").topCard.cardId).toBe("BT1-020");
    expect(invalid.state.memory).toBe(4);
  });

  it("drops the immunity once the TS Digimon unsuspends, so a real opponent suspend lands (CR 15-11-2-3-2)", async () => {
    const run = async (targetAlias: "ownTs" | "ownOther") => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT25-059", as: "ceresmon" }],
            battleArea: [
              { card: "BT25-062", as: "ownTs", suspended: true },
              { card: "BT1-013", as: "ownOther", suspended: true },
            ],
            deck: ["BT1-001", "BT1-002"],
          },
          1: {
            hand: [
              { card: "BT25-011", as: "opponentEffect" },
              { card: "BT25-011", as: "opponentEffect2" },
            ],
            deck: ["BT1-003", "BT1-004"],
          },
        },
        { autoAcceptOptional: false, autoSelectCards: false },
      );
      s.state.memory = 12;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceresmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const suspendDecision = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: suspendDecision.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      if (targetAlias === "ownTs") {
        ok(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon"));
      }
      await advance(s.engine).verb.unsuspend([s.perm("ownTs").permanentId, s.perm("ownOther").permanentId]);

      s.state.turnSeat = 1;
      s.state.memory = 20;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const effectChoice = s.state.pendingDecision!;
      const effectPayload = JSON.parse(effectChoice.payloadJson) as {
        candidateIds?: string[];
        candidateInstanceIds?: string[];
      };
      const effectCandidates = effectPayload.candidateIds ?? effectPayload.candidateInstanceIds ?? [];
      expect(effectCandidates).toContain(s.perm(targetAlias).permanentId);
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: effectChoice.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm(targetAlias).permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle();
      while (s.state.pendingDecision !== undefined) {
        const followup = s.state.pendingDecision;
        if (followup.kind === "optional") {
          deepStrictEqual(
            s.engine.applyIntent(followup.seat, {
              type: "respondDecision",
              decisionId: followup.decisionId,
              response: { kind: "optional", accept: false },
            }),
            { ok: true },
          );
          await settle();
          continue;
        }
        if (followup.kind !== "chooseTargets") break;
        const payload = JSON.parse(followup.payloadJson) as {
          candidateIds?: string[];
          candidateInstanceIds?: string[];
        };
        const candidates = payload.candidateIds ?? payload.candidateInstanceIds ?? [];
        expect(candidates.length).toBeGreaterThan(0);
        expect(
          s.engine.applyIntent(followup.seat, {
            type: "respondDecision",
            decisionId: followup.decisionId,
            response: { kind: "chooseTargets", instanceIds: [candidates[0]!] },
          }),
        ).toEqual({ ok: true });
        await settle();
      }
      // CR 15-11-2-3-2: unsuspended, it no longer matches "your suspended [TS] Digimon".
      if (targetAlias === "ownTs") ok(s.perm("ownTs").isSuspended);
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
      if (targetAlias === "ownTs") {
        s.state.turnSeat = 0;
        s.state.memory = 10;
        const ownTurn = s.engine.runOneTurn();
        await advance(s.engine).waitForMainPhase(0);
        advance(s.engine).endMainPhaseIfOpen(0);
        await ownTurn;

        s.state.turnSeat = 1;
        s.state.memory = 20;
        const secondOpponentTurn = s.engine.runOneTurn();
        await advance(s.engine).waitForMainPhase(1);
        deepStrictEqual(
          s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect2").instanceId }),
          { ok: true },
        );
        await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
        const secondChoice = s.state.pendingDecision!;
        const secondPayload = JSON.parse(secondChoice.payloadJson) as {
          candidateIds?: string[];
          candidateInstanceIds?: string[];
        };
        const secondCandidates = secondPayload.candidateIds ?? secondPayload.candidateInstanceIds ?? [];
        ok(secondCandidates.includes(s.perm("ownTs").permanentId));
        deepStrictEqual(
          s.engine.applyIntent(1, {
            type: "respondDecision",
            decisionId: secondChoice.decisionId,
            response: { kind: "chooseTargets", instanceIds: [s.perm("ownTs").permanentId] },
          }),
          { ok: true },
        );
        await settle();
        while (s.state.pendingDecision !== undefined) {
          const followup = s.state.pendingDecision;
          if (followup.kind === "optional") {
            deepStrictEqual(
              s.engine.applyIntent(followup.seat, {
                type: "respondDecision",
                decisionId: followup.decisionId,
                response: { kind: "optional", accept: false },
              }),
              { ok: true },
            );
            await settle();
            continue;
          }
          if (followup.kind !== "chooseTargets") break;
          const payload = JSON.parse(followup.payloadJson) as {
            candidateIds?: string[];
            candidateInstanceIds?: string[];
          };
          const candidates = payload.candidateIds ?? payload.candidateInstanceIds ?? [];
          ok(candidates.length > 0);
          deepStrictEqual(
            s.engine.applyIntent(followup.seat, {
              type: "respondDecision",
              decisionId: followup.decisionId,
              response: { kind: "chooseTargets", instanceIds: [candidates[0]!] },
            }),
            { ok: true },
          );
          await settle();
        }
        ok(s.perm("ownTs").isSuspended);
        advance(s.engine).endMainPhaseIfOpen(1);
        await secondOpponentTurn;
      }
      return s;
    };

    const immune = await run("ownTs");
    expect(immune.perm("ownTs").isSuspended).toBe(true);
    const control = await run("ownOther");
    expect(control.perm("ownOther").isSuspended).toBe(true);
  });

  it("counts all suspended Digimon for one once-per-turn DP reduction and keeps the turn-end duration", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "ceresmon" },
            { card: "BT1-013", as: "alreadySuspended", suspended: true },
            { card: "BT1-013", as: "toSuspend" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "otherSuspended", suspended: true },
            { card: "BT1-013", dp: 12000, as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("toSuspend").permanentId]);
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);

    await advance(s.engine).verb.unsuspend([s.perm("toSuspend").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("toSuspend").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(3000);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(12000);
  });
});

describe("BT25-059 Ceresmon — KB Q&A rulings", () => {
  const filler = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  /**
   * Play Ceresmon while `ownTs` (a [TS] Grizzlymon) and the non-[TS] control `ownOther` are
   * suspended, declining its optional suspend. `ownTs` is then not affected by the opponent's
   * Digimon effects until the opponent's turn ends. `before` runs ahead of the play.
   */
  async function shieldWithCeresmon(
    opponent: SeatSpec = {},
    before?: (s: EngineSetup, preferred: string[]) => Promise<void>,
  ) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-059", as: "ceresmon" }],
          battleArea: [
            { card: "BT25-051", as: "ownTs", suspended: true },
            { card: "BT1-013", as: "ownOther", suspended: true },
          ],
          deck: filler,
        },
        1: { deck: filler, ...opponent },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Suspend"], preferInstanceIds: preferred },
    );
    await s.ready();
    await before?.(s, preferred);
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceresmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).hasRestriction(s.perm("ownOther"), "beAffected", "Digimon")).toBe(false);
    return { s, preferred };
  }

  /** Resolve an opposing Digimon's [On Play] as its controller's effect, aimed at `targets` first. */
  async function opponentOnPlay(s: EngineSetup, preferred: string[], source: string, targets: string[]) {
    preferred.splice(0, preferred.length, ...targets.map((alias) => s.perm(alias).permanentId));
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm(source));
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks();
  }

  const unsuspendOwn = (s: EngineSetup) =>
    advance(s.engine).verb.unsuspend([s.perm("ownTs").permanentId, s.perm("ownOther").permanentId]);

  it("plays its 12-cost self for 0 when Sirenmon's security effect adds its own 7 reduction (Q6306)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
          battleArea: [
            { card: "BT1-009", suspended: true },
            { card: "BT1-009", suspended: true },
          ],
          deck: filler,
        },
        1: { deck: filler },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Suspend"] },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("sirenmon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-059"));

    expect(s.state.memory).toBe(0);
  });

  it("can suspend Digimon of either player with its [On Play] effect (Q6350)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-059", as: "ceresmon" }], battleArea: [{ card: "BT1-009", as: "own" }] },
        1: { battleArea: [{ card: "BT1-009", as: "theirs", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("own").permanentId, s.perm("theirs").permanentId);
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceresmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("own").isSuspended && s.perm("theirs").isSuspended);

    const offered = s.decisions
      .filter(({ req }) => req.sourceCardId === "BT25-059")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).toEqual(expect.arrayContaining([s.perm("own").permanentId, s.perm("theirs").permanentId]));
  });

  it.each([["ownTs"], ["ownOther"]] as const)(
    "lets an opponent's suspend effect land once %s has unsuspended (CR 15-11-2-3-2)",
    async (alias) => {
      const { s, preferred } = await shieldWithCeresmon({ battleArea: [{ card: "BT25-011", as: "aquilamon" }] });
      await unsuspendOwn(s);

      await opponentOnPlay(s, preferred, "aquilamon", [alias]);

      expect(s.perm(alias).isSuspended).toBe(true);
    },
  );

  it.each([
    ["ownTs", 4000],
    ["ownOther", 2000],
  ] as const)("keeps an opponent's -3000 DP effect from reducing it (%s DP=%i) (Q6351)", async (alias, dp) => {
    const { s, preferred } = await shieldWithCeresmon({ battleArea: [{ card: "ST22-04", as: "taomon" }] });

    await opponentOnPlay(s, preferred, "taomon", [alias]);

    expect(s.perm(alias).currentDP).toBe(dp);
  });

  it("can still be chosen by an opponent's effect, which then does nothing to it (Q6352)", async () => {
    const { s, preferred } = await shieldWithCeresmon({ battleArea: [{ card: "ST22-04", as: "taomon" }] });

    await opponentOnPlay(s, preferred, "taomon", ["ownTs"]);

    const offered = s.decisions
      .filter(({ req }) => req.sourceCardId === "ST22-04" && req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).toContain(s.perm("ownTs").permanentId);
    expect(s.perm("ownTs").currentDP).toBe(4000);
  });

  it("can be given an opponent's granted effect (Q6353)", async () => {
    const { s, preferred } = await shieldWithCeresmon({
      battleArea: [{ card: "BT20-065", as: "wormmon" }],
      hand: ["BT1-009"],
    });

    await opponentOnPlay(s, preferred, "wormmon", ["ownTs"]);

    expect(observe(s.engine).customEffectGrants(s.perm("ownTs"))).toHaveLength(1);
  });

  it("isn't considered to have <Security A. -1> given by an opponent's Digimon (Q6353)", async () => {
    const { s, preferred } = await shieldWithCeresmon({
      battleArea: [{ card: "EX10-014", as: "weatherdramon" }],
      security: ["BT1-009", "BT1-009", "BT1-009"],
    });
    await opponentOnPlay(s, preferred, "weatherdramon", ["ownTs", "ownOther"]);
    await unsuspendOwn(s);
    const attack = async (alias: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    };

    await attack("ownOther");
    expect(s.state.players[1]!.security).toHaveLength(3);
    await attack("ownTs");
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("stops being affected by an opponent's -3000 DP effect as soon as it gains the protection (Q6354)", async () => {
    const { s } = await shieldWithCeresmon(
      { battleArea: [{ card: "ST22-04", as: "taomon" }] },
      async (board, preferred) => {
        await opponentOnPlay(board, preferred, "taomon", ["ownTs"]);
        expect(board.perm("ownTs").currentDP).toBe(1000);
      },
    );

    expect(s.perm("ownTs").currentDP).toBe(4000);
  });

  /**
   * On the opponent's turn after Ceresmon, Wormmon gives the protected `ownTs`
   * "[On Deletion] Lose 1 memory." until the end of Ceresmon's controller's next turn.
   */
  async function grantOnDeletionDuringOpponentTurn() {
    const { s, preferred } = await shieldWithCeresmon({
      // Spare hand cards keep a legal Main action open, so the turn doesn't auto-pass after Wormmon.
      hand: [{ card: "BT20-065", as: "wormmon" }, "BT1-009", "BT1-009", "BT1-009"],
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    preferred.splice(0, preferred.length, s.perm("ownTs").permanentId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("ownTs")).length === 1);
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon")).toBe(true);
    return { s, opponentTurn };
  }

  it("is affected by the effect it was given once its protection ends (Q6355)", async () => {
    const { s, opponentTurn } = await grantOnDeletionDuringOpponentTurn();
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 5;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon")).toBe(false);
    const memoryBefore = s.state.memory;
    await advance(s.engine).verb.deletePermanent([s.perm("ownTs").permanentId]);
    await settle(() => s.state.memory === memoryBefore - 1);

    expect(s.state.memory).toBe(memoryBefore - 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("doesn't trigger a given [On Deletion] effect while it is not affected by effects (Q6356)", async () => {
    const { s, opponentTurn } = await grantOnDeletionDuringOpponentTurn();
    const memoryBefore = s.state.memory;
    const ownTsId = s.perm("ownTs").permanentId;

    await advance(s.engine).verb.deletePermanent([ownTsId]);
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownTsId)).toBe(false);
    expect(s.state.memory).toBe(memoryBefore);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
