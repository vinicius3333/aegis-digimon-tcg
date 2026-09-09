import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-045";

describe("EX11-045 Metatromon", () => {
  it("captures the official Assembly -5 recipe", () => {
    expect(runtimeCompiledCard(cardId)?.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          { kinds: ["Digimon"], colors: ["Black"], nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }], count: 5 },
        ],
      },
    ]);
  });
  it("preserves printed stats, text evolution, Blocker, and event-scoped inherited deletion", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Metatromon",
      colors: ["Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      types: ["Machine", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    // Printed ＜Blocker＞ lives on the keyword line, the shape registration reads for printed
    // keywords (peers EX11-035 / EX11-073).
    expect(compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords)).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: "Blocker" })]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "DeDigivolve", amount: 2 },
          { kind: "Restrict", restriction: "digivolve", duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { isSelfRef: true } }],
    });
    expect(irNode(inherited.actions[0]!).actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    });
  });

  it("carries printed Blocker on the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "source" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays through the public Assembly -5 route with five black Maquinamon-text cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: cardId, as: "source" }],
        trash: [
          { card: "EX11-027", as: "m1" },
          { card: "EX11-040", as: "m2" },
          { card: "EX11-042", as: "m3" },
          { card: "EX11-073", as: "m4" },
          { card: "EX11-040", as: "m5" },
        ],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: ["m1", "m2", "m3", "m4", "m5"].map((as) => s.inst(as).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(5);
    assertNoLoudGap(s);
  });

  it.each([
    ["On Play", "play"],
    ["When Digivolving", "digivolve"],
    ["When Attacking", "attack"],
  ] as const)("resolves the shared de-digivolve and restriction on %s", async (_label, route) => {
    const s = setupEngine(
      {
        0: {
          battleArea: route === "play" ? [] : [{ card: route === "digivolve" ? "EX11-042" : cardId, as: "source" }],
          hand: route === "play" ? [{ card: cardId, as: "source" }] : [{ card: cardId, as: "evolved" }],
        },
        1: { battleArea: [{ card: "EX11-040", as: "opponent", under: ["EX11-027", "EX11-042", "EX11-040"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();

    const result =
      route === "play"
        ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })
        : route === "digivolve"
          ? s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("source").permanentId,
              instanceId: s.inst("evolved").instanceId,
            })
          : s.engine.applyIntent(0, {
              type: "attack",
              attackerPermanentId: s.perm("source").permanentId,
              target: { kind: "player" },
            });
    expect(result).toEqual({ ok: true });

    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === cardId));
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === cardId)).toBe(true);
    expect(route === "attack" || observe(s.engine).isRestricted(s.perm("opponent"), "digivolve")).toBe(true);
    assertNoLoudGap(s);
  });

  it("free-evolves another Digimon at the end of its turn through the public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-027", as: "target" },
          ],
          hand: [{ card: "EX11-029", as: "evolution" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("target").topCard.cardId === "EX11-029");
    expect(s.perm("target").topCard.cardId).toBe("EX11-029");
    // The gauge changes perspective when the turn passes; no digivolution payment event is emitted.
    expect(s.state.memory).toBe(-3);
    expect(
      s.events.some((event) => event.kind === "memoryChanged" && "reason" in event && event.reason === "digivolve"),
    ).toBe(false);
    await turn;
    assertNoLoudGap(s);
  });

  it("deletes the opponent's lowest-play-cost Digimon when a public effect adds a card under the inherited host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-024", as: "host", under: [cardId] }],
          hand: [
            { card: "BT19-024", as: "placer" },
            { card: "BT19-021", as: "added" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-010", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("placer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT19-021"));
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT19-021");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    assertNoLoudGap(s);
  });
});
