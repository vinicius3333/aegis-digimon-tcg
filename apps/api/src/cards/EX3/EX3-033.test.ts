import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-033.js";

function respond(s: EngineSetup, response: DecisionResponse): void {
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(decision.seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-033 AeroVeedramon", () => {
  it("has the official errata identity and evolves from a yellow level 4 for 3", () => {
    expect(getCardDefinition("EX3-033")).toMatchObject({
      cardId: "EX3-033",
      nameEn: "AeroVeedramon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Dragon"],
      rarity: "R",
      imageId: "EX3-033-Errata",
    });
  });

  it("publishes the complete hand while enabling only Trial, with exact provenance", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-031", as: "base" }],
        hand: [
          { card: "EX3-033", as: "aeroveedramon" },
          { card: "EX3-069", as: "firstTrial" },
          { card: "EX3-069", as: "secondTrial" },
          { card: "BT1-010", as: "filler" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    const digivolve = advance(s.engine).verb.digivolveFromInstance(
      s.perm("base").permanentId,
      s.inst("aeroveedramon").instanceId,
    );
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-033",
      options: {
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("may place 1 [Trial of the Four Great Dragons]"),
      },
    });
    respond(s, { kind: "optional", accept: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-033",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.inst("firstTrial").instanceId,
          s.inst("secondTrial").instanceId,
        ]),
        visibleInstanceIds: expect.arrayContaining([
          s.inst("firstTrial").instanceId,
          s.inst("secondTrial").instanceId,
          s.inst("filler").instanceId,
        ]),
        visibleCards: expect.arrayContaining([
          { instanceId: s.inst("firstTrial").instanceId, cardId: "EX3-069" },
          { instanceId: s.inst("secondTrial").instanceId, cardId: "EX3-069" },
          { instanceId: s.inst("filler").instanceId, cardId: "BT1-010" },
        ]),
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("may place 1 [Trial of the Four Great Dragons]"),
        min: 1,
        max: 1,
      },
    });
    const options = s.decisions.at(-1)!.req.options as { candidateInstanceIds: string[] };
    expect(options.candidateInstanceIds).toHaveLength(2);
    expect(options.candidateInstanceIds).not.toContain(s.inst("filler").instanceId);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("secondTrial").instanceId] });
    await digivolve;

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("secondTrial").instanceId,
    );
  });

  it("Four Great Dragons family: places Trial from hand without playing or activating its Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-031", as: "base" }],
          hand: [
            { card: "EX3-033", as: "aeroveedramon" },
            { card: "EX3-069", as: "trial" },
          ],
          deck: [
            { card: "BT1-001", as: "digivolutionDraw" },
            { card: "BT1-002", as: "wouldBeMainDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aeroveedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("digivolutionDraw").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("wouldBeMainDraw").instanceId,
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("honors the errata's optional choice and leaves Trial in hand when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-031", as: "base" }],
          hand: [
            { card: "EX3-033", as: "aeroveedramon" },
            { card: "EX3-069", as: "trial" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aeroveedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-001"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trial").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("EX3-069");
  });

  it("does not offer placement when Trial is already in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-031", as: "base" },
          { card: "EX3-069", as: "existingTrial" },
        ],
        hand: [
          { card: "EX3-033", as: "aeroveedramon" },
          { card: "EX3-069", as: "secondTrial" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aeroveedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-001"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("secondTrial").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-033")).toHaveLength(0);
  });

  it("does not offer the optional placement when no Trial exists in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-031", as: "base" }],
        hand: [
          { card: "EX3-033", as: "aeroveedramon" },
          { card: "BT1-010", as: "filler" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("aeroveedramon").instanceId);
    await settle();

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-033")).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("filler").instanceId);
  });

  it("gains Blocker on the opponent's turn from either a Four Great Dragons Digimon or Trial", async () => {
    for (const enabler of ["EX3-036", "EX3-069"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "EX3-033", as: "aero" },
            { card: enabler, as: "enabler" },
          ],
        },
      });
      await s.ready();
      expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(false);

      s.state.turnSeat = 1;
      await advance(s.engine).recompute();
      expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(true);

      s.state.turnSeat = 0;
      await advance(s.engine).recompute();
      expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(false);
    }
  });

  it("does not gain its own Blocker from an unrelated Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-033", as: "aero" },
          { card: "BT1-010", as: "unrelated" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(false);
  });

  it("recomputes its Blocker when Trial enters and leaves, ignoring the opponent's enablers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-033", as: "aero" }],
        hand: [{ card: "EX3-069", as: "ownTrial" }],
      },
      1: {
        battleArea: [
          { card: "EX3-036", as: "opposingDragon" },
          { card: "EX3-069", as: "opposingTrial" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(false);

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("ownTrial").instanceId);
    await settle(() => observe(s.engine).hasKeyword(s.perm("aero"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(true);

    await advance(s.engine).verb.returnToHand([s.inst("ownTrial").instanceId]);
    await settle(() => !observe(s.engine).hasKeyword(s.perm("aero"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(false);
  });

  it("inherited effect grants Blocker to every Four Great Dragons only during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-053", under: [{ card: "EX3-033" }], as: "host" },
          { card: "EX3-036", as: "firstDragon" },
          { card: "EX3-035", as: "secondDragon" },
          { card: "BT1-010", as: "unrelated" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("firstDragon"), "Blocker")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("firstDragon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("secondDragon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("unrelated"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("firstDragon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("secondDragon"), "Blocker")).toBe(false);
  });

  it("uses the granted Blocker in real combat and keeps the surviving Digimon suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker", dp: 2000 }] },
      1: {
        battleArea: [
          { card: "EX3-033", as: "aero" },
          { card: "EX3-036", as: "dragon" },
        ],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 1;
    await s.ready();
    const aeroId = s.perm("aero").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [aeroId],
    });

    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: aeroId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    expect(s.perm("aero").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("inherited Blocker enables only allied Four Great Dragons in real combat", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-036", as: "opposingDragon", dp: 2000 }] },
      1: {
        battleArea: [
          { card: "BT1-053", under: [{ card: "EX3-033" }], as: "sourceHost" },
          { card: "EX3-035", as: "alliedDragon", dp: 10000 },
        ],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 1;
    await s.ready();
    const attackerId = s.perm("opposingDragon").permanentId;
    const alliedBlockerId = s.perm("alliedDragon").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("alliedDragon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opposingDragon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("sourceHost"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [alliedBlockerId],
    });

    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: alliedBlockerId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    expect(s.perm("alliedDragon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
