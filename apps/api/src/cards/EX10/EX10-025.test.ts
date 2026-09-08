import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase, type DecisionRequest } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-025.js";
import "../index.js";

const CARD_ID = "EX10-025";
const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

/** The next unanswered decision of `kind`, once the engine has published it. */
async function nextDecision(
  s: EngineSetup,
  kind: DecisionRequest["kind"],
  answered: Set<string>,
): Promise<DecisionRequest> {
  await settle(() => s.decisions.some(({ req }) => req.kind === kind && !answered.has(req.decisionId)));
  const found = s.decisions.find(({ req }) => req.kind === kind && !answered.has(req.decisionId));
  expect(found, `a pending ${kind} decision`).toBeDefined();
  answered.add(found!.req.decisionId);
  return found!.req;
}

describe("EX10-025 Sunarizamon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Sunarizamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile", "LIBERATOR", "Mineral"],
      // The catalog stores a NON-BREAKING space (U+00A0) before each "trait" — reported, not edited.
      effectText:
        "[On Play] You may place 2 cards with the [Mineral] or [Rock]\u00a0trait from your trash as 1 of your [Mineral] or [Rock]\u00a0trait Digimon's bottom digivolution cards.",
      inheritedEffectText:
        "When effects trash this card from a [Mineral] or [Rock]\u00a0trait Digimon's digivolution cards, delete 1 of your opponent's Digimon with a play cost of 4 or less.",
    });
    expect(getCardDefinition(CARD_ID)!.securityEffectText ?? "").toBe("");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          from: ["trash"],
          count: 2,
          position: "bottom",
          optional: true,
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
          },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("digivolves from a Black Lv.2 in breeding for 0 memory and keeps the egg as its source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT2-005", as: "egg" }, hand: [{ card: CARD_ID, as: "sunari" }], deck: INERT_DECK },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const eggPermanentId = s.perm("egg").permanentId;
    const sunariId = s.inst("sunari").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: eggPermanentId, instanceId: sunariId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === sunariId);

    // Printed evolution requirement is "Black Lv.2: Cost 0", plus the standard bonus draw.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    s.state.phase = Phase.Main;
    const moved = s.state.players[0]!.battleArea[0]!;
    expect(moved.topCard!.instanceId).toBe(sunariId);
    expect(moved.stack.map((card) => card.instanceId)).toEqual([eggId]);
  });

  it("refuses an illegal evolution source: a Red Lv.3 is neither Black nor Lv.2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "wrong" }], hand: [{ card: CARD_ID, as: "sunari" }], deck: INERT_DECK },
    });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrong").permanentId,
        instanceId: s.inst("sunari").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("wrong").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("sunari").instanceId);
    expect(s.state.memory).toBe(5);
  });

  // Q5078: with 2 or more eligible trash cards the placement is not a free choice of how many —
  // exactly 2 must be placed. Proved by the engine REFUSING a 1-card answer to the selection.
  it("Q5078: played from hand, the placement demands 2 cards and refuses a 1-card answer", async () => {
    const answered = new Set<string>();
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "sunari" }],
        battleArea: [
          { card: "EX10-028", as: "mineralHost", under: [{ card: "BT1-012", as: "existing" }] },
          { card: "BT1-009", as: "plainHost" },
        ],
        trash: [
          { card: CARD_ID, as: "mineral" },
          { card: "BT13-061", as: "rockA" },
          { card: "BT13-061", as: "rockB" },
          { card: "BT1-013", as: "plain" },
        ],
        deck: INERT_DECK,
      },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    await s.ready();
    s.state.memory = 3;
    const hostPermanentId = s.perm("mineralHost").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunari").instanceId })).toEqual({
      ok: true,
    });

    const optional = await nextDecision(s, "optional", answered);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    // The host is chosen among this player's [Mineral]/[Rock] Digimon only: the seeded
    // Landramon and the just-played Sunarizamon, never the plain [Mini Dragon] Monodramon.
    const host = await nextDecision(s, "chooseTargets", answered);
    const hostCandidates = host.options?.candidateInstanceIds ?? [];
    expect(hostCandidates).toContain(hostPermanentId);
    expect(hostCandidates).not.toContain(s.perm("plainHost").permanentId);
    expect(hostCandidates).not.toContain(s.perm("plainHost").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: host.decisionId,
        response: { kind: "chooseTargets", instanceIds: [hostPermanentId] },
      }),
    ).toEqual({ ok: true });

    const selection = await nextDecision(s, "selectCards", answered);
    expect(selection.options?.min).toBe(2);
    expect(selection.options?.max).toBe(2);
    // Only the [Mineral]/[Rock] cards are offered; the [Avian] card in the same trash is not.
    expect(selection.options?.candidateInstanceIds?.slice().sort()).toEqual(
      [s.inst("mineral").instanceId, s.inst("rockA").instanceId, s.inst("rockB").instanceId].sort(),
    );
    expect(selection.options?.candidateInstanceIds).not.toContain(s.inst("plain").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("mineral").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
    expect(s.perm("mineralHost").stack.map((card) => card.instanceId)).toEqual([s.inst("existing").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("mineral").instanceId, s.inst("rockA").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mineralHost").stack.length === 3 && s.state.pendingDecision === undefined);

    // Both placed cards sit BELOW the host's pre-existing source (index 0 is the stack bottom).
    const stack = s.perm("mineralHost").stack.map((card) => card.instanceId);
    expect(stack).toHaveLength(3);
    expect(stack.slice(0, 2).sort()).toEqual([s.inst("mineral").instanceId, s.inst("rockA").instanceId].sort());
    expect(stack.at(-1)).toBe(s.inst("existing").instanceId);
    expect(s.perm("plainHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("rockB").instanceId, s.inst("plain").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("sunari").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Q5079: only 1 eligible card in the trash — placing that single card is legal.
  it("Q5079: with a single eligible trash card the effect places just that one card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sunari" }],
          battleArea: [{ card: "EX10-028", as: "host" }],
          trash: [
            { card: "BT13-061", as: "only" },
            { card: "BT1-013", as: "plain" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const hostId = s.perm("host").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunari").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 1);

    const landed = s.state.players[0]!.battleArea.find((permanent) =>
      permanent.stack.some((card) => card.instanceId === s.inst("only").instanceId),
    );
    expect(landed).toBeDefined();
    expect([hostId, s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === CARD_ID)?.permanentId]).toContain(
      landed!.permanentId,
    );
    expect(landed!.stack.map((card) => card.instanceId)).toEqual([s.inst("only").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("plain").instanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the optional placement moves nothing and still leaves the Digimon in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sunari" }],
          battleArea: [{ card: "EX10-028", as: "host" }],
          trash: [
            { card: "BT13-061", as: "rockA" },
            { card: "BT13-061", as: "rockB" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunari").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("rockA").instanceId, s.inst("rockB").instanceId].sort(),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("offers no prompt at all when the trash holds no [Mineral] or [Rock] card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sunari" }],
          battleArea: [{ card: "EX10-028", as: "host" }],
          trash: [
            { card: "BT1-013", as: "plainA" },
            { card: "BT1-014", as: "plainB" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunari").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.pendingDecision === undefined);

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // The inherited clause, driven by a real opposing card effect: the opponent plays
  // BT3-100 Death Parade Blaster ("[Main] Trash up to 2 digivolution cards from the bottom
  // of all of your opponent's Digimon"), which effect-trashes this card off both hosts at once.
  it("inherited: deletes a cost-4-or-less opposing Digimon only from a [Mineral]/[Rock] host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-028", as: "mineralHost", under: [{ card: CARD_ID, as: "sunari" }] },
            { card: "BT1-009", as: "plainHost", under: [{ card: CARD_ID, as: "otherSunari" }] },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          hand: [{ card: "BT3-100", as: "blaster" }],
          // Two deletable Digimon (play cost 2 and 3), so a second, wrongly-firing watcher
          // would have a legal target too: exactly one of them may be gone at the end.
          // BT15-027 is the Blue Digimon that lets its controller play the Blue Option.
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-013", as: "lowB" },
            { card: "BT15-027", as: "high" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    const highId = s.perm("high").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blaster").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.pendingDecision === undefined, 120);

    // Both copies were trashed by the same effect, but only the one under the [Mineral] host
    // may delete — exactly 1 Digimon goes, and the play-cost-6 Digimon is never eligible.
    expect(s.perm("mineralHost").stack).toHaveLength(0);
    expect(s.perm("plainHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("sunari").instanceId, s.inst("otherSunari").instanceId].sort(),
    );
    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(remaining).toHaveLength(2);
    expect(remaining).toContain(highId);
    expect(remaining.filter((id) => id === lowAId || id === lowBId)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: stays silent when the same effect trashes OTHER cards off a [Mineral] host", async () => {
    // Printed: "when effects trash THIS CARD". BT3-100 takes the bottom 2 sources, which here
    // are the two inert cards; this card stays in the stack and nothing is deleted.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-028",
              as: "mineralHost",
              under: [
                { card: "BT1-013", as: "bottomA" },
                { card: "BT1-014", as: "bottomB" },
                { card: CARD_ID, as: "sunari" },
              ],
            },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          hand: [{ card: "BT3-100", as: "blaster" }],
          // BT3-100 is a Blue Option, so its controller needs a Blue Digimon in play to play it.
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT15-027", as: "blue" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const lowId = s.perm("low").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blaster").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mineralHost").stack.length === 1 && s.state.pendingDecision === undefined, 120);

    expect(s.perm("mineralHost").stack.map((card) => card.instanceId)).toEqual([s.inst("sunari").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("bottomA").instanceId, s.inst("bottomB").instanceId].sort(),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId).sort()).toEqual(
      [lowId, s.perm("blue").permanentId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
