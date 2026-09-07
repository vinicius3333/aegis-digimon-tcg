import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_039 } from "./BT25-039.js";
import "../index.js";

describe("BT25-039 Sirenmon", () => {
  it("keeps the TS evolution route alternate to the normal Yellow/Green routes", () => {
    expect(getCardDefinition("BT25-039")).toMatchObject({
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
    });
    expect(BT25_039.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
  });

  it("can digivolve from a TS level-4 base for the alternate cost of 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-033", as: "base" }],
          hand: [{ card: "BT25-039", as: "sirenmon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-039");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT25-033");
  });

  it("pays the ordinary yellow level-4 evolution cost", async () => {
    const yellowLv4 = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "yellowBase" }], hand: [{ card: "BT25-039", as: "sirenmon" }] },
    });
    yellowLv4.state.memory = 4;
    await yellowLv4.ready();
    expect(
      yellowLv4.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: yellowLv4.perm("yellowBase").permanentId,
        instanceId: yellowLv4.inst("sirenmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => yellowLv4.perm("yellowBase").topCard.cardId === "BT25-039");
    expect(yellowLv4.state.memory).toBe(0);
  });

  it("pays the ordinary green level-4 evolution cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-069", as: "greenBase" }], hand: [{ card: "BT25-039", as: "sirenmon" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard.cardId === "BT25-039");
    expect(s.state.memory).toBe(0);
  });

  it("rejects a wrong-color level-4 source on alternate and ordinary routes", async () => {
    const alternate = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "redBase" }], hand: [{ card: "BT25-039", as: "sirenmon" }] },
    });
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("redBase").permanentId,
        instanceId: alternate.inst("sirenmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "redBase" }], hand: [{ card: "BT25-039", as: "sirenmon" }] },
    });
    await ordinary.ready();
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("redBase").permanentId,
        instanceId: ordinary.inst("sirenmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("places this security card under the Ceresmon played by its security effect", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    const [play, place] = effect?.actions ?? [];
    expect(effect?.isSecurity).toBe(true);
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 7,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Ceresmon"], match: "name" }] } },
    });
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
      underFilter: { lastPlayed: true, controller: "mine", kind: ["Digimon"] },
      condition: { kind: "ifThisEffectActed" },
      optional: true,
    });
  });

  it("plays Ceresmon for 5 memory and places this face-up security card underneath it", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("sirenmon"));

    expect(s.state.memory).toBe(0);
    const ceresmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT25-059");
    expect(ceresmon).toBeDefined();
    expect(ceresmon!.stack.map((card) => card.cardId)).toContain("BT25-039");
    expect(ceresmon!.stack.find((card) => card.cardId === "BT25-039")?.faceUp).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("sirenmon").instanceId)).toBe(false);
  });

  it("combines Sirenmon's 7-cost reduction with Ceresmon's additional 5-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
          battleArea: [
            { card: "BT1-009", as: "suspendedOne", suspended: true },
            { card: "BT1-009", as: "suspendedTwo", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("sirenmon"));
    expect(s.state.memory).toBe(4);
    const ceresmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-059");
    expect(ceresmon?.stack.map((card) => card.cardId)).toContain("BT25-039");
  });

  it("can decline the security play without attempting the conditional placement", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 5;
    const firing = advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("sirenmon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decline = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decline.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("ceresmon").instanceId }),
    );
  });

  it("can accept the Ceresmon play and refuse only the conditional bottom placement", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 5;
    const firing = advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("sirenmon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const acceptPlay = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: acceptPlay.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== acceptPlay.decisionId,
    );
    const declinePlacement = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: declinePlacement.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.pendingDecision.decisionId !== declinePlacement.decisionId,
    );
    const ceresmonAction = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ceresmonAction.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await firing;
    const ceresmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-059");
    expect(ceresmon).toBeDefined();
    expect(ceresmon!.stack.map((card) => card.cardId)).not.toContain("BT25-039");
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("sirenmon").instanceId }),
    );
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
    const placement = effect?.actions?.[0] as { source?: unknown } | undefined;
    expect(placement?.source).toBeUndefined();
  });

  it("deletes itself once to prevent all simultaneous matching departures", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-033", as: "shaman" },
            { card: "BT25-034", as: "iliad" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("shaman").permanentId, s.perm("iliad").permanentId, s.perm("other").permanentId],
        "byBattle",
      ),
    ).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-033")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-034")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT25-039");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
  });

  it("protects mixed Shaman Digimon and Iliad Tamer departures with one Sirenmon cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-033", as: "shaman" },
            { card: "BT24-102", as: "iliadTamer" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("shaman").permanentId, s.perm("iliadTamer").permanentId],
        "byEffect",
      ),
    ).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("shaman").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("iliadTamer").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-039")).toBe(false);
  });

  it("Q6308 defers Sirenmon's On Deletion effect until the opponent's Option resolves", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-034", as: "protected" },
          ],
          security: [{ card: "BT1-001", as: "existing" }],
        },
        1: { hand: [{ card: "ST1-16", as: "gaia" }], battleArea: [{ card: "BT1-009", as: "redSource" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("protected").permanentId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST1-16"));
    const optionResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST1-16",
    );
    const sirenResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-039",
    );
    expect(optionResolved).toBeGreaterThanOrEqual(0);
    expect(sirenResolved).toBeGreaterThan(optionResolved);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT25-039");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("protected").permanentId)).toBe(true);
  });

  it("places On Deletion face up at the bottom below existing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-039", as: "sirenmon" }],
          security: [{ card: "BT1-001", as: "existing" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("sirenmon").permanentId], "byBattle");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT25-039"]);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
  });

  it("can refuse the optional On Deletion security placement", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-039", as: "sirenmon" }], security: ["BT1-001"] } },
      { autoAcceptOptional: false },
    );
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("sirenmon").permanentId], "byBattle");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-039");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).not.toContain("BT25-039");
  });

  it("does not replace a departure caused by the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-033", as: "shaman" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    const shamanId = s.perm("shaman").permanentId;
    const sirenmonId = s.perm("sirenmon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([shamanId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shamanId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sirenmonId)).toBe(true);
  });

  it("protects an Iliad Tamer while leaving an unrelated Tamer and Sirenmon unprotected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT24-102", as: "iliadTamer" },
            { card: "BT1-085", as: "otherTamer" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("otherTamer").permanentId], "byBattle")).toBe(1);
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("iliadTamer").permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("iliadTamer").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-085")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-039")).toBe(false);
  });

  it("protects all matching other Shaman/Iliad permanents from non-own effects", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "AllTurns");
    const replacement = effect?.actions?.[0] as { affectsAll?: boolean; sourceFilter?: unknown; cost?: unknown };
    expect(replacement.affectsAll).toBe(true);
    expect(replacement.sourceFilter).toMatchObject({
      controller: "mine",
      excludeSelf: true,
      kind: ["Digimon", "Tamer"],
      nameOrTrait: [{ tokens: ["Shaman", "Iliad"], match: "trait" }],
    });
    expect(replacement.cost).toMatchObject({ kind: "deleteOwn" });
  });

  it("inherits the optional once-per-turn redirect to a suspended Digimon", () => {
    expect(BT25_039.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: { filter: { controller: "mine", suspended: true, kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("redirects an opponent attack to a suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039", as: "sirenmon" }] },
            { card: "BT1-009", as: "redirect", suspended: true, dp: 12_000 },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 7_000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("redirect").permanentId),
    ).toBe(true);
  });

  it("redirects only the first of two opponent attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039", as: "sirenmon" }] },
            { card: "BT1-009", as: "firstRedirect", suspended: true, dp: 12_000 },
            { card: "BT1-009", as: "secondRedirect", suspended: true, dp: 12_000 },
          ],
          security: ["BT1-009", "BT1-009"],
          deck: [
            "BT1-006",
            "BT1-007",
            "BT1-008",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-015",
            "BT1-016",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 7_000 },
            { card: "BT1-009", as: "secondAttacker", dp: 7_000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstAttacker").instanceId) &&
        s.events.some((event) => event.kind === "combatResolved") &&
        s.state.phase === Phase.Main &&
        !observe(s.engine).isAttacking(),
      5_000,
    );
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("secondRedirect").permanentId,
      ),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("may decline the redirect without changing the original player target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039" }] },
            { card: "BT1-009", as: "redirect", suspended: true, dp: 12_000 },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7_000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.security.length === 0 && s.events.some((event) => event.kind === "combatResolved"),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("redirect").permanentId),
    ).toBe(true);
  });

  it("only fires the security End of Your Turn effect for face-up security on its owner's turn", async () => {
    const faceDown = setupEngine({
      0: {
        security: [{ card: "BT25-039", as: "sirenmon", faceUp: false }],
        hand: [{ card: "BT25-059", as: "ceresmon" }],
      },
    });
    faceDown.state.memory = 5;
    await advance(faceDown.engine).runTurn(0);
    expect(faceDown.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-059");

    const opponentTurn = setupEngine({
      0: {
        security: [{ card: "BT25-039", as: "sirenmon", faceUp: true }],
        hand: [{ card: "BT25-059", as: "ceresmon" }],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-002"] },
    });
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).runTurn(1);
    expect(opponentTurn.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-059");
  });

  it("protects a Shaman from a real public battle by deleting Sirenmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "sirenmon" },
            { card: "BT25-033", as: "shaman", suspended: true, dp: 5000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const sirenId = s.perm("sirenmon").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("shaman").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-033")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sirenId)).toBe(false);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT25-039");
  });

  it("resets inherited redirect after a completed opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039" }] },
            { card: "BT1-009", as: "firstTarget", suspended: true, dp: 12000 },
            { card: "BT1-009", as: "secondTarget", dp: 12000 },
          ],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 7000 },
            { card: "BT1-009", as: "secondAttacker", dp: 7000 },
            { card: "BT1-009", as: "opponentCandidate", suspended: true, dp: 12000 },
          ],
          deck: ["BT1-005", "BT1-006", "BT1-007", "BT1-008"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const first = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 2);
    advance(s.engine).endMainPhaseIfOpen(1);
    await first;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    s.state.phase = Phase.End;
    const own = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    // The controller's turn restores the first target; suspend only the distinct
    // second target so the reset proof cannot redirect to the stale target.
    s.perm("firstTarget").isSuspended = false;
    s.perm("secondTarget").isSuspended = true;
    advance(s.engine).endMainPhaseIfOpen(0);
    await own;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    s.state.phase = Phase.End;
    const second = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 2);
    expect(s.perm("secondTarget").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await second;
  });

  it("does not redirect to an unsuspended own or suspended opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "host", under: [{ card: "BT25-039" }] },
            { card: "BT1-009", as: "unsuspendedOwn", dp: 12000 },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 7000 },
            { card: "BT1-009", as: "opponentCandidate", suspended: true, dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 0);
    expect(s.perm("unsuspendedOwn").isSuspended).toBe(false);
    expect(s.perm("opponentCandidate").isSuspended).toBe(true);
  });
});
