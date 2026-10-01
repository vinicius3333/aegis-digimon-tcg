import { describe, it, expect } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { revealedDefinition } from "../../engine/effects/interpreter/actions/reveal.js";
import { CardInstance, getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT17-068.js";
import "../BT1/BT1-106.js";
import "../BT3/BT3-051.js";
import "../BT15/BT15-027.js";
import "../BT15/BT15-079.js";
import "./BT17-017.js";
import "./index.js";

const MEPHISTOMON = "BT17-068";
const GULFMON = "BT17-070";

describe("BT17-068 Mephistomon — [On Deletion] play Gulfmon from hand", () => {
  it("keeps the Gulfmon-or-level-6-Dark-Masters alternatives distinct", () => {
    const action = compiled.effects?.[1]?.actions?.[0];
    if (action?.kind !== "PlayWithoutCost") throw new Error("expected the on-deletion play action");
    expect(action.target.filter.nameOrTrait).toEqual([{ tokens: ["Gulfmon"], match: "nameExact" }]);
    expect(action.target.orFilters).toEqual([
      expect.objectContaining({ levels: [6], nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }] }),
    ]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      actions: [{ cost: { kind: "return", to: "deckBottom" } }],
    });
  });

  it("[On Deletion] plays Gulfmon from hand to battle area when Mephistomon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, suspended: true, as: "meph" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const mephPermId = s.perm("meph").permanentId;
    const gulfId = s.inst("gulfmon").instanceId;
    await advance(s.engine).verb.deletePermanent([mephPermId], "byEffect");
    await settle(() => !p0?.battleArea.some((p) => p.permanentId === mephPermId), 1000);

    expect(p0?.battleArea.some((p) => p.permanentId === mephPermId)).toBe(false);

    await settle(() => p0?.battleArea.some((p) => p.topCard?.cardId === GULFMON) ?? false, 400);

    const gulfInBattle = p0?.battleArea.some((p) => p.topCard?.instanceId === gulfId);
    expect(gulfInBattle).toBe(true);
  });

  it("[On Deletion] plays a level-6 Dark Masters Digimon from hand after an effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, as: "meph" }],
          hand: [{ card: "BT15-079", as: "darkMasters" }],
        },
        1: { hand: [{ card: "BT17-017", as: "remover" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const mephPermId = s.perm("meph").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === mephPermId));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-079"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-079")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT15-079")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] plays a level-6 Dark Masters Digimon from trash after an effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, as: "meph" }],
          trash: [{ card: "BT15-079", as: "darkMasters" }],
        },
        1: { hand: [{ card: "BT17-017", as: "remover" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const mephPermId = s.perm("meph").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === mephPermId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-079") &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-079")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT15-079")).toBe(false);
  });

  it("does not play Gulfmon after a natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, suspended: true, as: "meph" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
        },
        1: { battleArea: [{ card: "BT1-019", dp: 13000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("meph").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === MEPHISTOMON));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === GULFMON)).toBe(true);
  });

  it("places a qualifying Dark Masters-text card and gains DP after a natural inherited attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GULFMON, under: [MEPHISTOMON], as: "host" }],
          trash: [{ card: "BT15-072", as: "darkMastersText" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT15-072"));

    expect(s.perm("host").stack.some((card) => card.cardId === "BT15-072")).toBe(true);
    expect(s.perm("host").currentDP).toBe(13000);
  });

  it("keeps the revealed-from-deck level override resolved in runtime metadata", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter.js");
    const runtimeCard = runtimeCompiledCard(MEPHISTOMON)!;
    expect(runtimeCard.coverage).toBe("full");
    expect(runtimeCard.residual).toEqual([]);
  });
});

describe("BT17-068 Mephistomon — revealed level", () => {
  it("is treated as level 6 by revealed-card filters while retaining level 5", () => {
    const card = new CardInstance();
    card.cardId = "BT17-068";
    card.instanceId = "meph";
    card.ownerSeat = 0;
    const def = revealedDefinition({ game: { definitionOf: () => getCardDefinition("BT17-068")! } }, card);

    expect(def.level).toBe(6);
    expect(def.treatedAsLevels).toEqual([5, 6]);
  });

  it("gets accepted as both level 5 and level 6 by a natural deck reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-051", as: "dokugumon" }],
          deck: [
            { card: MEPHISTOMON, as: "meph" },
            { card: "BT17-068", as: "otherMeph" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([MEPHISTOMON, MEPHISTOMON]);
  });
});

const APOCALYMON = "BT15-102";

describe("BT17-068 Mephistomon — play-cost reduction", () => {
  it("reduces the hand play cost by 3 by returning 1 [Apocalymon] from trash to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: MEPHISTOMON, as: "meph" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: APOCALYMON, as: "apoc" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const apocId = s.inst("apoc").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meph").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === MEPHISTOMON));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === apocId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(apocId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === MEPHISTOMON)).toBe(true);
  });

  it("charges the full cost of 8 when no [Apocalymon] is in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: MEPHISTOMON, as: "meph" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meph").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === MEPHISTOMON));

    expect(s.state.memory).toBe(0);
  });
});

const SCORPIOMON = "BT15-027";
const DOKUGUMON = "BT3-051";
const GROUNDRAMON = "BT1-020";
const SYMPHONY_NO_1 = "BT1-106";
const ANCIENTGREYMON = "BT17-017";
const PIEDMON = "BT15-079";
const VILEMON = "BT15-072";
const YELLOW_DIGIMON = "BT1-047";
const LEVEL_3_FILLER = "BT1-009";

async function deleteMephistomonOnOpponentTurn(removerCardId: string): Promise<{ gulfmonPlayed: boolean }> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: MEPHISTOMON, as: "meph" }],
        hand: [{ card: GULFMON, as: "gulfmon" }],
      },
      1: { battleArea: [YELLOW_DIGIMON], hand: [{ card: removerCardId, as: "remover" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 20;
  const mephPermId = s.perm("meph").permanentId;
  await s.ready();

  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === mephPermId));
  await drainMicrotasks();

  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === mephPermId)).toBe(false);
  return {
    gulfmonPlayed: s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === GULFMON),
  };
}

describe("BT17-068 Mephistomon — KB Q&A rulings", () => {
  it("can be added by a reveal effect that adds level 6 or higher cards (Q2826)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: SCORPIOMON, as: "scorpiomon" }],
          deck: [
            { card: MEPHISTOMON, as: "meph" },
            { card: GROUNDRAMON, as: "plainLevel5" },
            LEVEL_3_FILLER,
            LEVEL_3_FILLER,
          ],
        },
      },
      { autoSelectCards: true, declineDigiXros: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scorpiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === SCORPIOMON) &&
        s.state.players[0]!.deck.length < 4 &&
        s.state.pendingDecision === undefined,
    );

    const hand = s.state.players[0]!.hand;
    expect(hand.map((card) => card.instanceId)).toEqual([s.inst("meph").instanceId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("plainLevel5").instanceId)).toBe(true);
    expect(getCardDefinition(MEPHISTOMON)?.level).toBe(5);
  });

  it("lets Dokugumon add two revealed copies as its level 5 and level 6 cards (Q2827)", async () => {
    async function revealWithDokugumon(topCards: string[]): Promise<string[]> {
      const s = setupEngine(
        {
          0: { hand: [{ card: DOKUGUMON, as: "dokugumon" }], deck: [...topCards, LEVEL_3_FILLER] },
        },
        { autoSelectCards: true, declineDigiXros: true },
      );
      s.state.memory = 6;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokugumon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.deck.length === 0 && s.state.pendingDecision === undefined);
      return s.state.players[0]!.hand.map((card) => card.cardId);
    }

    expect(await revealWithDokugumon([MEPHISTOMON, MEPHISTOMON])).toEqual([MEPHISTOMON, MEPHISTOMON]);
    expect(await revealWithDokugumon([GROUNDRAMON, GROUNDRAMON])).toEqual([GROUNDRAMON]);
  });

  it("does not activate its [On Deletion] when a DP reduction to 0 deletes it by the rules (Q2828)", async () => {
    expect(await deleteMephistomonOnOpponentTurn(SYMPHONY_NO_1)).toEqual({ gulfmonPlayed: false });
    expect(await deleteMephistomonOnOpponentTurn(ANCIENTGREYMON)).toEqual({ gulfmonPlayed: true });
  });

  it("places only a level 5 or lower card with [Dark Masters] in its text for the inherited +2000 DP (Q2829)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GULFMON, under: [MEPHISTOMON], as: "host" }],
          trash: [
            { card: PIEDMON, as: "level6DarkMasters" },
            { card: GROUNDRAMON, as: "level5WithoutText" },
            { card: VILEMON, as: "level4DarkMastersText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const piedmonId = s.inst("level6DarkMasters").instanceId;
    const groundramonId = s.inst("level5WithoutText").instanceId;
    preferInstanceIds.push(piedmonId, groundramonId);
    const vilemonId = s.inst("level4DarkMastersText").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === vilemonId));

    const stack = s.perm("host").stack;
    expect(stack[0]?.instanceId).toBe(vilemonId);
    expect(stack.some((card) => card.instanceId === piedmonId || card.instanceId === groundramonId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([piedmonId, groundramonId]);
    expect(s.perm("host").currentDP).toBe(13000);
  });
});
