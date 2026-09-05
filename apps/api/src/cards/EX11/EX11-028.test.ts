import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-028";

describe("EX11-028 Galemon", () => {
  it("encodes its evolution requirement and all catalog effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Galemon",
      colors: ["Green"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Bird Dragon", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            {
              kind: "Suspend",
              optional: true,
              target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Suspend",
              optional: true,
              target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
        expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn" }),
        expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" }),
      ]),
    );
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    expect(allTurns.actions[0]).toMatchObject({
      actions: [{ target: { filter: { nameOrTrait: [{ tokens: ["Shoto Kazama"], match: "nameExact" }] } } }],
    });
  });

  it("plays Shoto Kazama when an own Digimon suspends with at most one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "EX11-062", as: "shoto" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("ally").permanentId });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not play Shoto with two Tamers or after the once-per-turn effect is spent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "galemon" },
            { card: "BT1-009", as: "ally" },
            { card: "BT1-085", as: "tamer1" },
            { card: "BT1-086", as: "tamer2" },
          ],
          hand: [{ card: "EX11-062", as: "shoto" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("ally").permanentId });
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-062");
    assertNoLoudGap(s);
  });

  // KB Q5825: the [On Play] [When Digivolving] suspension may take EITHER player's Digimon, which
  // is what `controllerDefault: "any"` encodes — a `controller: "mine"` filter would hide the
  // opponent's Digimon from the offer.
  it("offers the opponent's Digimon to the On Play suspension (Q5825)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "galemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "theirs" }] },
      },
      { autoSelectCards: false },
    );
    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("galemon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
    expect(decision.options?.candidateInstanceIds).toContain(s.perm("theirs").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("theirs").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.perm("galemon").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  // "When any of YOUR Digimon suspend": the `whenSuspended` bus is board-wide, so the
  // `sourceFilter: { controller: "mine" }` scope is what keeps an opponent's suspension out.
  it("does not play Shoto when an opponent's Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "galemon" }], hand: [{ card: "EX11-062", as: "shoto" }] },
        1: { battleArea: [{ card: "BT1-009", as: "theirs" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("theirs").permanentId });
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-062");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062")).toBe(false);
    assertNoLoudGap(s);
  });

  it("gains inherited battle memory only once per turn in a stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-029", as: "host", under: [cardId] }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });
});
