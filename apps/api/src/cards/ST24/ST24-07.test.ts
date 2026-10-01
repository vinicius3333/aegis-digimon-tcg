import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-07 ShineGreymon", () => {
  it("proves dual-card keywords, shared once-per-turn effects, and GeoGrey Sword's two-step Main effect", () => {
    const compiled = registeredCompiledCards.get("ST24-07") ?? getCompiledCard("ST24-07")!;
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords ?? [])
        .map((keyword) => keyword.keyword),
    ).toEqual(["Raid", "Piercing", "SecurityAttack"]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand", "trash"],
            payCost: false,
            target: { filter: { controller: "mine", kind: ["Tamer"], playCostLte: 5 } },
          },
          { kind: "ModifyDP", amount: -9000, duration: "forTheTurn" },
        ],
      });
      expect(effect?.actions[1]).not.toHaveProperty("optional");
    }
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "ModifyDP", amount: -6000 },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } } },
        },
      ],
    });
  });

  it("applies the mandatory DP reduction after the optional Tamer play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-06", as: "base" }],
          hand: [
            { card: "ST24-07", as: "shineGreymon" },
            { card: "ST24-13", as: "declinedTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shineGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt === undefined) throw new Error("Optional prompt missing");
    {
      expect(
        s.engine.applyIntent(prompt.seat, {
          type: "respondDecision",
          decisionId: prompt.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.perm("opponent").currentDP === 1000);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("declinedTamer").instanceId);
    expect(s.perm("opponent").currentDP).toBe(1000);
  });

  it("uses Raid in a real player attack and resolves Piercing plus Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST24-07", as: "attacker" }] },
        1: {
          battleArea: [{ card: "ST2-10", as: "highest" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highestId = s.perm("highest").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.target.kind === "permanent" &&
          event.target.permanentId === highestId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highestId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

function geoGreySwordBoard(declinePrompts: string[] = []) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "ST24-06", as: "host" }], hand: [{ card: "ST24-07", as: "sword" }] },
      1: {
        battleArea: [
          { card: "BT25-039", as: "zeroed", dp: 6000 },
          { card: "BT1-009", as: "deletedByEffect", dp: 3000 },
        ],
      },
    },
    { autoAcceptOptional: true, declinePrompts },
  );
  s.state.memory = 5;
  return s;
}

/** Aim GeoGrey Sword's -6000 at `zeroed` and its deletion at `deletedByEffect`. */
async function useGeoGreySword(s: EngineSetup) {
  const zeroedId = s.perm("zeroed").permanentId;
  const deletedByEffectId = s.perm("deletedByEffect").permanentId;
  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sword").instanceId, useAs: "option" }),
  ).toEqual({ ok: true });
  let answeredDecisionId: string | undefined;
  for (const [targetId, fate] of [
    [zeroedId, undefined],
    [deletedByEffectId, "delete"],
  ] as const) {
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== answeredDecisionId,
    );
    const decision = s.state.pendingDecision!;
    answeredDecisionId = decision.decisionId;
    const options = JSON.parse(decision.payloadJson) as { candidateInstanceIds: string[]; targetFate?: string };
    expect(options.targetFate).toBe(fate);
    expect(options.candidateInstanceIds).toContain(zeroedId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [targetId] },
      }),
    ).toEqual({ ok: true });
  }
}

function eventIndex(s: EngineSetup, predicate: (event: EngineSetup["events"][number]) => boolean): number {
  return s.events.findIndex(predicate);
}

function deletionIndex(s: EngineSetup, cardId: string): number {
  return eventIndex(
    s,
    (event) => event.kind === "cardsMoved" && (event.deletedPermanents ?? []).some((entry) => entry.cardId === cardId),
  );
}

describe("ST24-07 ShineGreymon — KB Q&A rulings", () => {
  it("is used as a [DATA SQUAD] trait Option card by RizeGreymon's play-or-use effect (Q6214)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST24-13",
              as: "tamer",
              under: [
                { card: "BT1-001", faceUp: false },
                { card: "BT1-002", faceUp: false },
              ],
            },
          ],
          hand: [
            { card: "ST24-06", as: "rizeGreymon" },
            { card: "ST24-07", as: "sword" },
            { card: "BT1-094", as: "otherOption" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        declinePrompts: ["Arts Digivolve"],
      },
    );
    s.state.memory = 10;
    await s.ready();
    const swordId = s.inst("sword").instanceId;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizeGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === swordId));

    // RizeGreymon alone leaves the 12000 DP target at 7000; only GeoGrey Sword's [Main] deletes it.
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("otherOption").instanceId]);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("deletes a 0 DP Digimon only after the used GeoGrey Sword is trashed (Q6215)", async () => {
    const s = geoGreySwordBoard(["Arts Digivolve"]);
    await s.ready();
    const swordId = s.inst("sword").instanceId;

    await useGeoGreySword(s);
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === swordId));
    await settle(() => s.state.pendingDecision === undefined);

    const swordTrashed = eventIndex(
      s,
      (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(swordId),
    );
    expect(deletionIndex(s, "BT1-009")).toBeLessThan(swordTrashed);
    expect(deletionIndex(s, "BT25-039")).toBeGreaterThan(swordTrashed);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes a 0 DP Digimon after Arts Digivolve, triggering its [On Deletion] with [When Digivolving] (Q6215)", async () => {
    const s = geoGreySwordBoard();
    await s.ready();

    await useGeoGreySword(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const arts = s.state.pendingDecision!;
    expect(arts.promptText).toContain("Arts Digivolve");
    expect(s.perm("zeroed").currentDP).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: arts.decisionId,
        response: { kind: "selectCards", instanceIds: [s.perm("host").topCard.instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "BT25-039" && event.timing === "OnDestroyedAnyone",
      ),
    );

    const digivolved = eventIndex(s, (event) => event.kind === "digivolved" && event.cardId === "ST24-07");
    const zeroedDeleted = deletionIndex(s, "BT25-039");
    const whenDigivolvingResolved = eventIndex(
      s,
      (event) =>
        event.kind === "effectResolved" && event.sourceCardId === "ST24-07" && event.timing === "WhenDigivolving",
    );
    const onDeletionResolved = eventIndex(
      s,
      (event) =>
        event.kind === "effectResolved" && event.sourceCardId === "BT25-039" && event.timing === "OnDestroyedAnyone",
    );
    expect(s.perm("host").topCard.cardId).toBe("ST24-07");
    expect(digivolved).toBeGreaterThanOrEqual(0);
    expect(zeroedDeleted).toBeGreaterThan(digivolved);
    expect(whenDigivolvingResolved).toBeGreaterThan(zeroedDeleted);
    expect(onDeletionResolved).toBeGreaterThan(whenDigivolvingResolved);
  });
});
