import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./EX3-034.js";

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

describe("EX3-034 Angewomon", () => {
  it("has the official errata identity and evolves from a yellow level 4 for 3", () => {
    expect(getCardDefinition("EX3-034")).toMatchObject({
      cardId: "EX3-034",
      nameEn: "Angewomon",
      colors: ["Yellow"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Archangel"],
      rarity: "U",
      imageId: "EX3-034-Errata",
    });
  });

  it("publishes the complete hand while enabling only Trial, with exact provenance", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-031", as: "base" }],
        hand: [
          { card: "EX3-034", as: "angewomon" },
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
      s.inst("angewomon").instanceId,
    );
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-034",
      options: {
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("may place 1 [Trial of the Four Great Dragons]"),
      },
    });
    respond(s, { kind: "optional", accept: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-034",
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
  it("Four Great Dragons family: places Trial without activating Main and reacts with -3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-031", as: "base" }],
          hand: [
            { card: "EX3-034", as: "angewomon" },
            { card: "EX3-069", as: "trial" },
          ],
          deck: [
            { card: "BT1-001", as: "digivolutionDraw" },
            { card: "BT1-002", as: "wouldBeMainDraw" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 7000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("digivolutionDraw").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("wouldBeMainDraw").instanceId,
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("honors the optional errata and leaves Trial in hand when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-031", as: "base" }],
          hand: [
            { card: "EX3-034", as: "angewomon" },
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
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-001"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trial").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("EX3-069");
  });

  it("does not offer the placement when Trial is already in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-031", as: "base" }],
        hand: [
          { card: "EX3-034", as: "angewomon" },
          { card: "EX3-069", as: "existingTrial" },
          { card: "EX3-069", as: "secondTrial" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("existingTrial").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-001"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("secondTrial").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034")).toHaveLength(0);
  });

  it("does not offer the optional placement when no Trial exists in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-031", as: "base" }],
        hand: [
          { card: "EX3-034", as: "angewomon" },
          { card: "BT1-010", as: "filler" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("angewomon").instanceId);
    await settle();

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034")).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("filler").instanceId);
  });

  it("applies its play watcher once per turn across multiple Four Great Dragons", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "angewomon" }],
          hand: [
            { card: "EX3-035", as: "firstDragon" },
            { card: "EX3-036", as: "secondDragon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 10000, as: "chosen" },
            { card: "BT1-011", dp: 10000, as: "unchosen" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    await settle(() => s.perm("chosen").currentDP === 7000);
    await advance(s.engine).verb.playInstances([s.inst("secondDragon").instanceId]);
    await settle();

    expect(s.perm("chosen").currentDP).toBe(7000);
    expect(s.perm("unchosen").currentDP).toBe(10000);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034" && req.kind === "chooseTargets"),
    ).toHaveLength(1);
  });

  it("does not react to a Four Great Dragons play during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "angewomon" }],
          hand: [{ card: "EX3-035", as: "dragon" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 7000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("dragon").instanceId]);
    await settle();

    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034")).toHaveLength(0);
  });

  it("ignores an unrelated Digimon play and reacts when Trial is placed separately", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "angewomon" }],
          hand: [
            { card: "BT1-010", as: "unrelated" },
            { card: "EX3-069", as: "trial" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", dp: 7000, as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("unrelated").instanceId]);
    await settle();
    expect(s.perm("target").currentDP).toBe(7000);

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("trial").instanceId);
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("lets two copies trigger independently, expires the debuffs, and resets once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-034", as: "firstAngewomon" },
            { card: "EX3-034", as: "secondAngewomon" },
          ],
          hand: [
            { card: "EX3-035", as: "firstDragon" },
            { card: "EX3-036", as: "secondDragon" },
            { card: "EX3-025", as: "nextTurnDragon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 10000, as: "firstTarget" },
            { card: "BT1-011", dp: 10000, as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    await settle(() => s.perm("firstTarget").currentDP + s.perm("secondTarget").currentDP === 14000);
    expect([s.perm("firstTarget").currentDP, s.perm("secondTarget").currentDP].sort((a, b) => a - b)).toEqual([
      4000, 10000,
    ]);

    await advance(s.engine).verb.playInstances([s.inst("secondDragon").instanceId]);
    await settle();
    expect([s.perm("firstTarget").currentDP, s.perm("secondTarget").currentDP].sort((a, b) => a - b)).toEqual([
      4000, 10000,
    ]);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034" && req.kind === "chooseTargets"),
    ).toHaveLength(2);

    await advance(s.engine).runTurn(0);
    expect([s.perm("firstTarget").currentDP, s.perm("secondTarget").currentDP]).toEqual([10000, 10000]);
    await advance(s.engine).verb.playInstances([s.inst("nextTurnDragon").instanceId]);
    await settle(() => s.perm("firstTarget").currentDP + s.perm("secondTarget").currentDP === 14000);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034" && req.kind === "chooseTargets"),
    ).toHaveLength(4);
  });

  it("inherited family effect grants the same once-per-turn -3000 DP watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-053", under: [{ card: "EX3-034" }], as: "host" }],
          hand: [
            { card: "EX3-035", as: "firstDragon" },
            { card: "EX3-036", as: "secondDragon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 10000, as: "target" },
            { card: "BT1-011", dp: 10000, as: "unchosen" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    await settle(() => s.perm("target").currentDP === 7000);
    await advance(s.engine).verb.playInstances([s.inst("secondDragon").instanceId]);
    await settle();

    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.perm("unchosen").currentDP).toBe(10000);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-034" && req.kind === "chooseTargets"),
    ).toHaveLength(1);
  });

  it("inherited watcher reacts to Trial placement with the complete target decision contract", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-053", under: [{ card: "EX3-034" }], as: "host" }],
          hand: [{ card: "EX3-069", as: "trial" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 7000, as: "target" },
            { card: "BT1-011", dp: 7000, as: "otherTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("trial").instanceId);
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("otherTarget").currentDP).toBe(7000);
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-034",
      options: {
        candidateInstanceIds: expect.arrayContaining([s.perm("target").permanentId, s.perm("otherTarget").permanentId]),
        min: 1,
        max: 1,
        timing: "YourTurn",
        effectText: expect.stringMatching(
          /When you play a Digimon with \[Four Great Dragons\].*place a \[Trial of the Four Great Dragons\].*-3000 DP for the turn/i,
        ),
      },
    });
  });
});
