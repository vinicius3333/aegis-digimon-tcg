import { digivolutionRequirementsFor, EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-033";

async function playAndDeclineMaquinamonLink(s: ReturnType<typeof setupEngine>, timing: EffectTiming) {
  const effect = advance(s.engine).fire(timing, s.perm("source"));
  await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
  const play = s.decisions.find(({ req }) => req.kind === "optional")!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: play.decisionId,
      response: { kind: "optional", accept: true },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
  const link = s.decisions.filter(({ req }) => req.kind === "optional").at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: link.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
  await effect;
}

describe("EX11-033 Maneuvermon", () => {
  it("preserves printed stats, text evolution, linking, and scoped subtriggers", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Maneuvermon",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Beast", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand", "linked"],
        target: { filter: { hostFilter: { isSelfRef: true } } },
        payCost: false,
        optional: true,
      });
    }
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn.actions).toHaveLength(1);
    expect(yourTurn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { isSelfRef: true },
          }),
        ],
      }),
    );
  });

  it("plays Maquinamon from hand without paying", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("maquinamon").instanceId);
    const maquinamonId = s.inst("maquinamon").instanceId;
    await playAndDeclineMaquinamonLink(s, EffectTiming.WhenMoving);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === maquinamonId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not fire this clause on On Play and can refuse the Moving play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-027" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-027");
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-027");
  });

  it("does not treat ExMaquinamon as exact Maquinamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-073" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-073");
  });

  it("plays from hand through a real breeding-to-battle move", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some(({ cardId: id }) => id === "EX11-027"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).not.toContain("EX11-027");
    assertNoLoudGap(s);
  });

  it("does not play a Maquinamon from this Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["EX11-027"] }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-027"]);
  });

  it("can refuse playing Maquinamon out of its own link cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", linked: [{ card: "EX11-027", as: "maquinamon" }] }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.perm("source").linked.map(({ cardId: id }) => id)).toEqual(["EX11-027"]);
    assertNoLoudGap(s);
  });

  it("cannot reach a Maquinamon under another of the controller's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-040", as: "other", linked: [{ card: "EX11-027", as: "maquinamon" }] },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.perm("other").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("maquinamon").instanceId]);
    expect(s.perm("source").linked).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("only its own link event suspends and prevents unsuspending, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-027", as: "other" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.perm("first").isSuspended).toBe(false);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("source").permanentId });
    expect(s.perm("first").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    expect(s.perm("first").isSuspended).toBe(true);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("source").permanentId });
    expect(s.perm("second").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not suspend from its link watcher during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("source").permanentId });
    expect(s.perm("opponent").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("inherits a once-per-turn unsuspend only when its own host deletes in battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-034", as: "host", under: [cardId], suspended: true }] } },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").isSuspended).toBe(false);
    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
