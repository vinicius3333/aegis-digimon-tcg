import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-112.js";
import "./BT13-007.js";
import "./BT13-040.js";
import "./BT13-111.js";

describe("BT13-112 Omnimon", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.length).toBeGreaterThan(0);
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-112", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-112");
  });

  it("offers the printed modal choice and can delete any opposing Digimon", async () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Modal",
      optional: true,
      choose: 1,
      options: [
        [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
        [
          expect.objectContaining({ kind: "PlayWithoutCost", bindResultAs: "playedRoyalKnights" }),
          expect.objectContaining({
            kind: "Delete",
            condition: { kind: "bindingExists", ref: "playedRoyalKnights" },
            target: { filter: { controller: "mine", zone: "breeding" }, count: 1 },
          }),
          expect.objectContaining({
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          }),
        ],
      ],
    });

    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-112", as: "omnimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.memory).toBe(-4);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === targetId)).toBe(false);
  });

  it("plays one of each distinct Royal Knight name from breeding, then trashes the breeding Digimon and grants Rush", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-112", as: "omnimon" }],
          breeding: { card: "BT13-007", as: "drasil", under: ["BT13-040", "BT13-111", "BT13-040"] },
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT13-007"));
    await s.engine.recomputeContinuousEffects();

    expect(s.state.players[0]!.breeding?.topCard).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-040")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT13-040").length).toBe(1);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT13-111").length).toBe(1);
    for (const permanent of s.state.players[0]!.battleArea.filter((p) =>
      ["BT13-040", "BT13-111"].includes(p.topCard?.cardId ?? ""),
    )) {
      expect(observe(s.engine).hasKeyword(permanent, "Rush")).toBe(true);
    }
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Rush")).toBe(true);
    // CR 15-11-2-2: a Digimon that enters afterwards gains it too.
    const lateKeywordEntrant0 = s.putOnBoard(0, "BT1-083");
    expect(observe(s.engine).hasKeyword(lateKeywordEntrant0, "Rush")).toBe(true);
  });

  it("plays every playable distinct Royal Knight, then cleans up blocked stack cards (Q2367)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-112", as: "omnimon" }],
          breeding: {
            card: "BT13-007",
            as: "drasil",
            under: [
              { card: "BT13-040", as: "blockedMagnamon" },
              { card: "BT13-111", as: "playableGallantmon" },
            ],
          },
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    const blockedId = s.inst("blockedMagnamon").instanceId;
    const playableId = s.inst("playableGallantmon").instanceId;
    const hostId = s.perm("drasil").topCard!.instanceId;
    advance(s.engine).ledgers.continuous.addPlayProhibition(
      0,
      1,
      { kinds: ["Digimon"], dpAtMost: 10000 },
      "play",
      EffectDuration.UntilEachTurnEnd,
      { byEffectOnly: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-112"));

    expect(s.state.players[0]!.breeding?.topCard).toBeUndefined();
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.instanceId === playableId)).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === blockedId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === blockedId)).toBe(true);

    const playableIndex = s.events.findIndex(
      (event) => event.kind === "cardPlayed" && event.cardId === "BT13-111" && event.seat === 0,
    );
    const cleanupIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        event.from === "breeding" &&
        event.to === "trash" &&
        event.instanceIds.includes(blockedId),
    );
    expect(playableIndex).toBeGreaterThanOrEqual(0);
    expect(cleanupIndex).toBeGreaterThan(playableIndex);
    expect(s.events[cleanupIndex]).toMatchObject({
      kind: "cardsMoved",
      from: "breeding",
      to: "trash",
      instanceIds: expect.arrayContaining([hostId, blockedId]),
    });
    const cleanupEvent = s.events[cleanupIndex];
    if (cleanupEvent?.kind !== "cardsMoved") throw new Error("Expected breeding cleanup movement");
    expect(cleanupEvent.instanceIds).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("playableGallantmon"), "Rush")).toBe(true);
  });

  it("allows declining the optional modal effect", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-112", as: "omnimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-112"));
    expect(s.state.memory).toBe(-4);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });

  it("fires the same modal when legally digivolving from a level-6 red Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "BT1-009", as: "bonus" }],
          battleArea: [{ card: "BT13-111", as: "base" }],
          hand: [{ card: "BT13-112", as: "omnimon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    s.state.memory = 4;
    const baseId = s.inst("base").instanceId;
    const bonusId = s.inst("bonus").instanceId;
    const targetId = s.perm("target").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([bonusId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
  });
});

describe("BT13-112 Omnimon — KB Q&A rulings", () => {
  it("plays 1 of each Royal Knight name, including an [Omnimon], and leaves a duplicate name behind (Q2366)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-112", as: "omnimon" }],
          breeding: {
            card: "BT13-007",
            as: "drasil",
            under: [
              { card: "BT1-084", as: "underOmnimon" },
              { card: "BT9-066", as: "firstAlphamon" },
              { card: "BT6-111", as: "secondAlphamon" },
              { card: "BT13-111", as: "gallantmon" },
              { card: "BT9-017", as: "gallantmonX" },
              { card: "BT1-009", as: "notRoyalKnight" },
            ],
          },
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    const alphamonIds = [s.inst("firstAlphamon").instanceId, s.inst("secondAlphamon").instanceId];
    const notRoyalKnightId = s.inst("notRoyalKnight").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT13-007"));
    await settle();

    const battleCardIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
    expect(battleCardIds).toEqual(expect.arrayContaining(["BT13-112", "BT1-084", "BT13-111", "BT9-017"]));
    expect(battleCardIds.filter((cardId) => ["BT9-066", "BT6-111"].includes(cardId))).toHaveLength(1);
    expect(battleCardIds).toHaveLength(5);
    expect(s.state.players[0]!.trash.filter((card) => alphamonIds.includes(card.instanceId))).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === notRoyalKnightId)).toBe(true);
  });

  it("trashes the breeding Digimon together with its remaining digivolution cards (Q2368)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-112", as: "omnimon" }],
          breeding: {
            card: "BT13-007",
            as: "drasil",
            under: [
              { card: "BT1-009", as: "leftover" },
              { card: "BT13-111", as: "played" },
            ],
          },
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    const drasilId = s.perm("drasil").topCard.instanceId;
    const leftoverId = s.inst("leftover").instanceId;
    const playedId = s.inst("played").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === drasilId));
    await settle();

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toEqual(expect.arrayContaining([drasilId, leftoverId]));
  });

  it("processes <Overflow> for an Omnimon ACE trashed from under the breeding King Drasil_7D6 (Q2369)", async () => {
    async function trashBreedingWith(remainingCard: string) {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT13-112", as: "omnimon" }],
            breeding: {
              card: "BT13-007",
              as: "drasil",
              under: [
                { card: "BT1-084", as: "playedOmnimon" },
                { card: remainingCard, as: "remaining" },
              ],
            },
          },
        },
        {
          autoAcceptOptional: true,
          autoChooseOption: true,
          preferOptionIndex: 1,
          autoSelectCards: true,
          preferInstanceIds,
        },
      );
      preferInstanceIds.push(s.inst("playedOmnimon").instanceId);
      const drasilId = s.perm("drasil").topCard.instanceId;
      const remainingId = s.inst("remaining").instanceId;
      s.state.memory = 10;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === drasilId));
      await settle();

      expect(s.state.players[0]!.trash.some((card) => card.instanceId === remainingId)).toBe(true);
      return s.events.flatMap((event) =>
        event.kind === "memoryChanged" && event.reason === "overflow" ? [event.from - event.to] : [],
      );
    }

    expect(await trashBreedingWith("BT17-078")).toEqual([5]);
    expect(await trashBreedingWith("BT1-009")).toEqual([]);
  });
});
