import { appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  settle,
  setupEngine,
  type EngineSetup,
  type PermanentSpec,
  type SeatSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-024.js";

async function toOpponentMain(s: EngineSetup): Promise<{ loop: Promise<void> }> {
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  return { loop };
}

describe("BT23-024 Poseidomon", () => {
  it("declares Evade and Link +1", () => {
    expect(getCardDefinition("BT23-024")).toMatchObject({
      cardId: "BT23-024",
      nameEn: "Poseidomon",
      colors: ["Blue", "White"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["God", "Appmon"],
      attributes: ["God"],
      types: ["Invincible"],
    });
    const keywords = compiled.effects.flatMap(
      (entry) => entry.actions?.filter((action) => action.kind === "GainKeyword") ?? [],
    );
    expect(keywords).toEqual([
      expect.objectContaining({ keyword: { keyword: "Evade", raw: "＜Evade＞" }, duration: "permanent" }),
      expect.objectContaining({ keyword: { keyword: "Link", amount: 1, raw: "＜Link +1＞" }, duration: "permanent" }),
    ]);
  });

  it("may link an Appmon from hand or its digivolution cards when digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const action = compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          source: "thisDigimon",
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
        payCost: false,
        optional: true,
      });
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns")!;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "ArmSuspendRestriction",
          duration: "untilOpponentTurnEnd",
          cost: { kind: "unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Oujamon", "Beautymon"], cost: 0 }]);
    expect(appFusionCostFor("BT23-024", { topName: "Oujamon", linkedNames: ["Beautymon"] })).toBe(0);
    expect(appFusionCostFor("BT23-024", { topName: "Beautymon", linkedNames: ["Oujamon"] })).toBe(0);
  });

  it("publicly App Fuses Oujamon and Beautymon into Poseidomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-022", as: "host", linked: [{ card: "BT23-033", as: "beautymon" }] }],
          hand: [
            { card: "BT23-024", as: "poseidomon" },
            { card: "BT23-007", as: "entryCandidate" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const oldTopId = s.perm("host").topCard!.instanceId;
    const beautyId = s.inst("beautymon").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("poseidomon").instanceId,
        linkedInstanceId: beautyId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("poseidomon").instanceId);
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("poseidomon").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([oldTopId, beautyId]);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("poseidomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("entryCandidate").instanceId);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", cardId: "BT23-024" }),
    );
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("pays the unsuspend cost and dynamically exempts only the highest play-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon", suspended: true }],
          hand: [{ card: "BT23-007", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "lower" },
            { card: "BT1-080", as: "highest" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("poseidomon").permanentId]);
    expect(s.perm("poseidomon").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highest"), "suspend")).toBe(false);
  });

  it("exempts every tied highest-cost opponent while restricting the lower-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon", suspended: true }],
          hand: [{ card: "BT23-007", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "lower" },
            { card: "BT1-080", as: "highestA" },
            { card: "BT1-080", as: "highestB" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highestA"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("highestB"), "suspend")).toBe(false);
  });

  it("restricts no-play-cost Amon and Umon tokens while exempting a costed Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon", suspended: true }],
          hand: [{ card: "BT23-007", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "TOKEN-Amon-of-Crimson-Flame", as: "amon" },
            { card: "TOKEN-Umon-of-Blue-Thunder", as: "umon" },
            { card: "BT1-024", as: "costed" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("amon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("umon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("costed"), "suspend")).toBe(false);
  });

  it("restricts every opponent token when no opponent Digimon has a play cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon", suspended: true }],
          hand: [{ card: "BT23-007", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "TOKEN-Amon-of-Crimson-Flame", as: "amon" },
            { card: "TOKEN-Umon-of-Blue-Thunder", as: "umon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("amon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("umon"), "suspend")).toBe(true);
  });

  it("links only the valid Appmon candidate from a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-024", as: "invalidPoseidomon" },
            { card: "BT1-009", as: "nonAppmon" },
            { card: "BT23-007", as: "validLink" },
          ],
          security: ["ST1-02", "ST1-02"],
        },
        1: { hand: [{ card: "BT23-007", as: "opponentControl" }], security: ["ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("poseidomon").linked.some((card) => card.instanceId === s.inst("validLink").instanceId));
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toEqual([s.inst("validLink").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("invalidPoseidomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonAppmon").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentControl").instanceId);
  });

  it("reclassifies the highest-cost exemption after a public higher-cost Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-007", as: "link" },
            { card: "ST1-02", as: "neutralOwn" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "oldHighest" },
            { card: "BT1-009", as: "lowCost" },
          ],
          hand: [
            { card: "BT12-069", as: "newHighest" },
            { card: "ST1-02", as: "neutral" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("poseidomon").isSuspended);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lowCost"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oldHighest"), "suspend")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("newHighest").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("newHighest").topCard?.cardId === "BT12-069");
    await s.engine.recomputeContinuousEffects();
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("oldHighest"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lowCost"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("newHighest"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("oldHighest").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reclassifies the exemption after an opponent digivolves into a higher play cost, per Q5251", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-007", as: "link" },
            { card: "ST1-02", as: "neutralOwn" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT23-017", as: "tiedA" },
            { card: "BT23-017", as: "tiedB" },
          ],
          hand: [
            { card: "BT23-020", as: "higher" },
            { card: "ST1-02", as: "neutralOpponent" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("tiedA"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tiedB"), "suspend")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("tiedA").permanentId,
        instanceId: s.inst("higher").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tiedA").topCard?.instanceId === s.inst("higher").instanceId);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("tiedA"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tiedB"), "suspend")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("tiedB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reclassifies through production turns and a public higher-cost play", async () => {
    const automation = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-007", as: "link" },
            { card: "ST1-02", as: "neutralOwn" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
        1: {
          battleArea: [{ card: "BT1-030", as: "oldHighest" }],
          hand: [
            { card: "ST2-13", as: "sparkA" },
            { card: "ST2-13", as: "sparkB" },
            { card: "ST6-05", as: "newHighest" },
            { card: "BT7-107", as: "calling" },
            { card: "ST1-02", as: "neutralOpponent" },
          ],
          security: ["ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT1-045", "BT1-047"],
        },
      },
      automation,
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("poseidomon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.memory).toBe(3);
    for (const alias of ["sparkA", "sparkB"] as const) {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle();
    }
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("newHighest").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("newHighest").topCard?.cardId === "ST6-05");
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("oldHighest"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("newHighest"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("oldHighest").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    automation.autoSelectCards = false;
    automation.autoAcceptOptional = false;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.at(-1)?.req.kind === "chooseTargets");
    const callingTarget = s.decisions.at(-1)!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: callingTarget.req.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("newHighest").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => ["optional", "selectCards"].includes(s.decisions.at(-1)?.req.kind ?? ""));
    const recoverPrompt = s.decisions.at(-1)!;
    const recoverResponse =
      recoverPrompt.req.kind === "optional"
        ? { kind: "optional" as const, accept: false }
        : { kind: "selectCards" as const, instanceIds: [] };
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: recoverPrompt.req.decisionId,
        response: recoverResponse,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.topCard?.cardId !== "ST6-05"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "ST6-05")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST6-05");
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("oldHighest"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("oldHighest").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    await s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  });

  it("uses Link +1 capacity for two links and replaces the oldest at the third", async () => {
    const automation = { autoAcceptOptional: true, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-007", as: "firstLink" },
            { card: "BT23-009", as: "secondLink" },
            { card: "BT23-016", as: "thirdLink" },
          ],
        },
      },
      automation,
    );
    s.state.memory = 10;
    for (const alias of ["firstLink", "secondLink"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst(alias).instanceId,
          targetPermanentId: s.perm("poseidomon").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("poseidomon").linked.some((card) => card.instanceId === s.inst(alias).instanceId));
    }
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toEqual([
      s.inst("secondLink").instanceId,
      s.inst("firstLink").instanceId,
    ]);
    expect(s.state.memory).toBe(7);
    automation.autoSelectCards = false;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("thirdLink").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.at(-1)?.req.kind === "selectCards");
    const trimPrompt = s.decisions.at(-1)!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: trimPrompt.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("firstLink").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("poseidomon").linked.some((card) => card.instanceId === s.inst("thirdLink").instanceId));
    expect(s.perm("poseidomon").linked).toHaveLength(2);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toContain(s.inst("secondLink").instanceId);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toContain(s.inst("thirdLink").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstLink").instanceId);
    expect(s.perm("poseidomon").currentDP).toBe(17000);
  });

  it("resets the linked unsuspend reaction on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-007", as: "linkA" },
            { card: "BT23-009", as: "linkB" },
            { card: "BT23-016", as: "linkC" },
            { card: "ST1-02", as: "neutral" },
          ],
          security: [
            "BT1-009",
            "BT1-013",
            "BT1-027",
            "BT1-028",
            "BT1-045",
            "BT1-047",
            "BT1-050",
            "BT1-064",
            "BT1-065",
            "ST1-02",
          ],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
        1: {
          hand: [{ card: "ST1-02", as: "enemyNeutral" }],
          security: [
            "BT1-009",
            "BT1-013",
            "BT1-027",
            "BT1-028",
            "BT1-045",
            "BT1-047",
            "BT1-050",
            "BT1-064",
            "BT1-065",
            "ST1-02",
          ],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("poseidomon").isSuspended);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toContain(s.inst("linkA").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("poseidomon").isSuspended);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toContain(s.inst("linkB").instanceId);
    expect(s.perm("poseidomon").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("poseidomon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("poseidomon").isSuspended);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toContain(s.inst("linkC").instanceId);
    expect(s.perm("poseidomon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    [true, "accepts"],
    [false, "refuses"],
  ] as const)("%s Evade after a public Raid attack", async (accept, _label) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-024", as: "poseidomon" }], security: ["ST1-02"] },
        1: { battleArea: [{ card: "EX6-011", as: "attacker" }], security: ["ST1-02"], deck: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    const { loop } = await toOpponentMain(s);
    s.state.memory = 10;
    const poseidomonId = s.perm("poseidomon").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: poseidomonId, accept })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadeResolved"));
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "evadeResolved", permanentId: poseidomonId, accepted: accept }),
    );
    await settle(() => !observe(s.engine).isAttacking());
    const survivor = s.state.players[0]!.battleArea.find((p) => p.permanentId === poseidomonId);
    expect(survivor?.isSuspended).toBe(accept ? true : undefined);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
      accept ? [s.inst("poseidomon").instanceId] : [],
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      accept ? [] : [s.inst("poseidomon").instanceId],
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly enforces the suspension exception and expires it after the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [
            { card: "BT23-007", as: "link" },
            { card: "ST1-02", as: "neutralPlay" },
          ],
          security: ["ST1-02", "ST1-02", "ST1-02", "ST1-02"],
          deck: ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT1-045", "BT1-047", "BT1-050", "BT1-064"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "lower" },
            { card: "BT1-080", as: "highest" },
          ],
          security: ["ST1-02", "ST1-02", "ST1-02", "ST1-02"],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          deck: ["BT1-028", "BT1-045", "BT1-047", "BT1-050", "BT1-064", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("poseidomon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highest"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("highest").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("lower").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot arm the restriction when already unsuspended, because the cost is unpayable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-024", as: "poseidomon" }], hand: [{ card: "BT23-007", as: "link" }] },
        1: {
          battleArea: [
            { card: "BT23-016", as: "lower" },
            { card: "BT23-022", as: "highest" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(false);
  });

  it("when digivolving links an Appmon from this Digimon's stack, not another friendly stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT23-022",
              as: "base",
              under: [
                { card: "BT23-007", as: "ownLink" },
                { card: "BT23-009", as: "baseLv4" },
              ],
            },
            {
              card: "BT23-022",
              as: "otherHost",
              under: [
                { card: "BT23-007", as: "otherLink" },
                { card: "BT23-009", as: "otherLv4" },
              ],
            },
          ],
          hand: [{ card: "BT23-024", as: "poseidomon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const baseTopId = s.perm("base").topCard!.instanceId;
    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("poseidomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.instanceId === s.inst("ownLink").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("poseidomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseInstanceId);
    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("ownLink").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("baseLv4").instanceId, baseTopId]);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toEqual([
      s.inst("otherLink").instanceId,
      s.inst("otherLv4").instanceId,
    ]);
    expect(s.perm("otherHost").linked).toHaveLength(0);
  });
});

describe("BT23-024 Poseidomon — KB Q&A rulings", () => {
  const DECK = ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT1-045", "BT1-047", "BT1-050", "BT1-064"];
  const SECURITY = ["ST1-02", "ST1-02", "ST1-02", "ST1-02"];
  const COST_5 = "BT1-020";
  const COST_6 = "BT1-019";
  const NO_COST_TOKEN = "TOKEN-Amon-of-Crimson-Flame";

  /**
   * Poseidomon attacks, links Musclemon from the hand, pays the unsuspend cost and arms the
   * suspension lock; then the turn passes to the opponent's Main phase.
   */
  async function armLockThenOpponentMain(opponent: {
    battleArea: (PermanentSpec | string)[];
    hand?: SeatSpec["hand"];
  }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon" }],
          hand: [{ card: "BT23-007", as: "link" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { ...opponent, security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("poseidomon").isSuspended);
    expect(s.perm("poseidomon").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.engine.recomputeContinuousEffects();

    const attackWith = (alias: string) =>
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      });
    const finishAttack = async () => {
      await settle(() => !observe(s.engine).isAttacking());
    };
    const close = async () => {
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, attackWith, finishAttack, close };
  }

  const ILLEGAL = { ok: false, reason: "illegal-target" };

  function expectLocked(run: Awaited<ReturnType<typeof armLockThenOpponentMain>>, alias: string) {
    expect(observe(run.s.engine).isRestricted(run.s.perm(alias), "suspend")).toBe(true);
    expect(run.attackWith(alias)).toEqual(ILLEGAL);
    expect(run.s.perm(alias).isSuspended).toBe(false);
  }

  it.each([
    { label: "has only Appmon without <Link>", hand: ["BT22-039"], linked: [] as string[] },
    { label: "also has an Appmon with <Link>", hand: ["BT22-039", "BT23-007"], linked: ["BT23-007"] },
  ])("links no card without <Link> when attacking and the hand $label (Q5246)", async ({ hand, linked }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon", under: ["BT24-079"] }],
          hand,
          security: SECURITY,
        },
        1: { security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("poseidomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("poseidomon").linked.map((card) => card.cardId)).toEqual(linked);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT22-039");
    expect(s.perm("poseidomon").stack.map((card) => card.cardId)).toEqual(["BT24-079"]);
  });

  it("stops a play cost 5 Digimon from suspending while the play cost 6 one can (Q5247)", async () => {
    const run = await armLockThenOpponentMain({
      battleArea: [
        { card: COST_5, as: "lower" },
        { card: COST_6, as: "highest" },
      ],
    });

    expectLocked(run, "lower");
    expect(run.attackWith("highest")).toEqual({ ok: true });
    await run.finishAttack();
    expect(run.s.perm("highest").isSuspended).toBe(true);
    await run.close();
  });

  it("lets the opponent's only Digimon suspend, because it is their highest play cost (Q5248)", async () => {
    const run = await armLockThenOpponentMain({ battleArea: [{ card: COST_5, as: "only" }] });

    expect(run.attackWith("only")).toEqual({ ok: true });
    await run.finishAttack();
    expect(run.s.perm("only").isSuspended).toBe(true);
    await run.close();
  });

  it("lets both of two tied play cost 5 Digimon suspend (Q5249)", async () => {
    const run = await armLockThenOpponentMain({
      battleArea: [
        { card: COST_5, as: "tiedA" },
        { card: COST_5, as: "tiedB" },
      ],
    });

    expect(run.attackWith("tiedA")).toEqual({ ok: true });
    await run.finishAttack();
    expect(run.attackWith("tiedB")).toEqual({ ok: true });
    await run.finishAttack();
    expect(run.s.perm("tiedA").isSuspended).toBe(true);
    expect(run.s.perm("tiedB").isSuspended).toBe(true);
    await run.close();
  });

  it("stops the former highest play cost Digimon once a play cost 6 Digimon is played (Q5250)", async () => {
    const run = await armLockThenOpponentMain({
      battleArea: [{ card: COST_5, as: "former" }],
      hand: [{ card: COST_6, as: "newHighest" }],
    });
    expect(observe(run.s.engine).isRestricted(run.s.perm("former"), "suspend")).toBe(false);

    run.s.state.memory = 6;
    expect(run.s.engine.applyIntent(1, { type: "playCard", instanceId: run.s.inst("newHighest").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => run.s.state.players[1]!.battleArea.length === 2);
    await run.s.engine.recomputeContinuousEffects();

    expectLocked(run, "former");
    await run.close();
  });

  it("frees the play cost 5 Digimon once the play cost 6 Digimon leaves the battle area (Q5252)", async () => {
    const run = await armLockThenOpponentMain({
      battleArea: [
        { card: COST_5, as: "lower" },
        { card: COST_6, as: "highest" },
      ],
    });
    expectLocked(run, "lower");

    await advance(run.s.engine).verb.deletePermanent([run.s.perm("highest").permanentId]);
    await run.s.engine.recomputeContinuousEffects();
    expect(run.s.state.players[1]!.battleArea).toHaveLength(1);

    expect(run.attackWith("lower")).toEqual({ ok: true });
    await run.finishAttack();
    expect(run.s.perm("lower").isSuspended).toBe(true);
    await run.close();
  });

  it("stops every Digimon from suspending when none of them has a play cost (Q6025)", async () => {
    const run = await armLockThenOpponentMain({
      battleArea: [
        { card: NO_COST_TOKEN, as: "tokenA" },
        { card: NO_COST_TOKEN, as: "tokenB" },
      ],
    });
    expect(run.s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual([NO_COST_TOKEN, NO_COST_TOKEN]);

    expectLocked(run, "tokenA");
    expectLocked(run, "tokenB");
    await run.close();
  });

  it("keeps a no-play-cost Digimon locked after a costed Digimon is played (Q6026)", async () => {
    const run = await armLockThenOpponentMain({
      battleArea: [{ card: NO_COST_TOKEN, as: "token" }],
      hand: [{ card: COST_5, as: "costed" }],
    });
    expectLocked(run, "token");

    run.s.state.memory = 5;
    expect(run.s.engine.applyIntent(1, { type: "playCard", instanceId: run.s.inst("costed").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => run.s.state.players[1]!.battleArea.length === 2);
    await run.s.engine.recomputeContinuousEffects();

    expect(observe(run.s.engine).isRestricted(run.s.perm("costed"), "suspend")).toBe(false);
    expectLocked(run, "token");
    await run.close();
  });
});
