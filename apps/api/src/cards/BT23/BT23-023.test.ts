import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT23-015.js";
import { compiled } from "./BT23-023.js";

/** Inert main-deck Digimon with no triggered text, so a draw never opens a decision. */
const INERT_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-027", "BT1-028"];

/**
 * Hand the turn to seat 1 through the real turn loop instead of writing `state.turnSeat`.
 * Returns the loop promise so the caller can surrender and await it.
 */
async function toOpponentMain(s: EngineSetup): Promise<{ loop: Promise<void> }> {
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  return { loop };
}

describe("BT23-023 Whamon", () => {
  it("once per turn replaces non-owner-effect removal with an optional stack play", () => {
    expect(getCardDefinition("BT23-023")).toMatchObject({
      cardId: "BT23-023",
      nameEn: "Whamon",
      colors: ["Blue"],
      level: 5,
      playCost: 9,
      dp: 9000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sea Animal", "CS"],
    });
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns")!;
    const replacement = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            source: "thisDigimon",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: { op: "lte", value: 4 },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [expect.objectContaining({ kind: "Replacement", event: "wouldLeavePlay" })],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
  });

  it("publicly plays a blue level-4 source for free when an opponent Option deletes Whamon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "whamon", under: ["BT1-009", { card: "BT23-018", as: "eligible" }] }],
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "redEnabler" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const { loop } = await toOpponentMain(s);
    const whamonId = s.perm("whamon").permanentId;
    preferInstanceIds.push(whamonId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === whamonId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === whamonId)).toBe(false);
    // The replaced Whamon and the unchosen digivolution card go to the trash; only one card returns.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("whamon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly replaces opponent-effect deletion with its exact source card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "whamon", dp: 7000, under: [{ card: "BT23-018", as: "source" }] }],
          hand: [{ card: "ST1-02", as: "spare" }],
          deck: INERT_DECK,
        },
        1: { hand: [{ card: "BT23-015", as: "phoenix" }], deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { loop } = await toOpponentMain(s);
    s.state.memory = 10;
    const whamonPermanentId = s.perm("whamon").permanentId;
    const sourceId = s.inst("source").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === whamonPermanentId)).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays the exact Whamon source when Decoy protects its host from public Gaia Force", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-030",
              as: "surfimon",
              under: [
                { card: "BT23-016", as: "secondSource" },
                "BT23-039",
                { card: "BT23-021", as: "source" },
                "BT23-023",
              ],
            },
            { card: "BT6-059", as: "firstDecoy" },
            { card: "BT6-059", as: "secondDecoy" },
          ],
          hand: [{ card: "ST1-02", as: "neutralOwn" }],
          deck: INERT_DECK,
        },
        1: {
          hand: [
            { card: "ST1-16", as: "firstGaia" },
            { card: "ST1-16", as: "secondGaia" },
            { card: "ST1-16", as: "thirdGaia" },
            { card: "ST1-02", as: "neutralPlay" },
          ],
          battleArea: [{ card: "BT1-021", as: "redEnabler" }],
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    const { loop } = await toOpponentMain(s);
    s.state.memory = 10;
    const hostId = s.perm("surfimon").permanentId;
    const sourceId = s.inst("source").instanceId;
    const secondSourceId = s.inst("secondSource").instanceId;
    preferInstanceIds.push(hostId, sourceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstDecoy").instanceId);
    // Second use in the same turn: Once Per Turn is spent, so no second source is played.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondSourceId)).toBe(false);
    expect(s.perm("surfimon").stack.map((card) => card.instanceId)).toContain(secondSourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondDecoy").instanceId);
    // Next opponent turn: the Once Per Turn has reset and the reaction fires again.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("thirdGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondSourceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondSourceId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly evolves for 3 from a CS level-4 source and preserves it beneath the new top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-018", as: "base" }],
        hand: [{ card: "BT23-023", as: "whamon" }],
        deck: INERT_DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const whamonId = s.inst("whamon").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: whamonId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === whamonId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.perm("base").topCard?.instanceId).toBe(whamonId);
    // Digivolving draws one bonus card, so the emptied hand refills to exactly one card.
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("rejects the alternate Digivolve from a level-4 source without the CS trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-027", as: "base" }],
        hand: [{ card: "BT23-023", as: "whamon" }],
        deck: INERT_DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("whamon").instanceId,
      useAlternateCost: true,
    });
    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("whamon").instanceId);
  });

  it("uses inherited Whamon replacement when an opponent effect removes a legal stacked host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT23-035",
              as: "host",
              dp: 7000,
              under: [
                { card: "BT23-018", as: "source" },
                { card: "BT23-023", as: "inherited" },
              ],
            },
          ],
          deck: INERT_DECK,
        },
        1: { hand: [{ card: "BT23-015", as: "phoenix" }], deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { loop } = await toOpponentMain(s);
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("only searches Whamon's own digivolution cards and skips an ineligible source", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // BT1-009 Monodramon is a level-3 black Digimon without the CS trait: no legal play.
            { card: "BT23-023", as: "whamon", under: [{ card: "BT1-009", as: "ineligible" }] },
            { card: "BT23-035", as: "neighbor", under: [{ card: "BT23-019", as: "wrongStack" }] },
          ],
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "redEnabler" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const { loop } = await toOpponentMain(s);
    const whamonId = s.perm("whamon").permanentId;
    preferInstanceIds.push(whamonId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((card) => card.permanentId === whamonId));
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("wrongStack").instanceId),
    ).toBe(false);
    expect(s.perm("neighbor").stack.some((card) => card.instanceId === s.inst("wrongStack").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("ineligible").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ineligible").instanceId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherits the same CS-or-blue reaction from a realistic stack, per Q5245", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-035", as: "carrier", under: [{ card: "BT23-017", as: "eligible" }, "BT23-020", "BT23-023"] },
          ],
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "redEnabler" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const { loop } = await toOpponentMain(s);
    const carrierId = s.perm("carrier").permanentId;
    preferInstanceIds.push(carrierId, s.inst("eligible").instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((card) => card.permanentId === carrierId));
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the optional replacement play and let the source go to the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-023", as: "whamon", under: [{ card: "BT23-018", as: "eligible" }] }],
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "redEnabler" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: INERT_DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const { loop } = await toOpponentMain(s);
    const whamonId = s.perm("whamon").permanentId;
    preferInstanceIds.push(whamonId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === whamonId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("eligible").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("whamon").instanceId, s.inst("eligible").instanceId]),
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not react to its controller's own effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-023", as: "whamon", under: [{ card: "BT23-018", as: "eligible" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // Structural: the engine exposes no public own-effect that deletes your own Digimon
    // without also carrying text of its own, so the owner-effect negative uses the verb seam.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("whamon").permanentId], "byEffect")).toBe(1);
    await settle();
    expect(
      s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === s.inst("eligible").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
  });
});
