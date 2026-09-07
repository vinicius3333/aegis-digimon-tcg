import { type GameState, getCardDefinition, type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-057.js";

const TOKEN_CARD_ID = "TOKEN-Hinukamuy-Token";

/** The three trash cards the play-cost reduction accepts: one [Huckmon], one [Sistermon], one [Jesmon]. */
const NAMED_TRASH = ["BT13-009", "BT10-085", "BT13-017"] as const;

function tokenOf(state: GameState): Permanent[] {
  return state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === TOKEN_CARD_ID);
}

describe("BT23-057 Gankoomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-057")).toMatchObject({
      cardId: "BT23-057",
      nameEn: "Gankoomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 3 },
        { color: "Red", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["top", 0],
    ["bottom", 1],
  ])(
    "reduces the play cost by 5 by returning three named cards from the trash to the %s of the deck",
    async (where, optionIndex) => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT23-057", as: "gankoomon" }],
            trash: [
              { card: NAMED_TRASH[0], as: "huckmon" },
              { card: NAMED_TRASH[1], as: "sistermon" },
              { card: NAMED_TRASH[2], as: "jesmon" },
              { card: "BT1-039", as: "unrelated" },
            ],
            deck: ["BT1-010", "BT1-011"],
          },
          1: { battleArea: [{ card: "BT1-039", as: "cost6" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: optionIndex },
      );
      s.state.memory = 11;
      await s.ready();
      const gankoomonId = s.inst("gankoomon").instanceId;
      const returnedIds = [s.inst("huckmon"), s.inst("sistermon"), s.inst("jesmon")].map((card) => card.instanceId);
      const unrelatedId = s.inst("unrelated").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: gankoomonId })).toEqual({ ok: true });
      await settle(() => s.state.memory === 5 && s.state.pendingDecision === undefined);

      // Play cost 11 - 5 = 6, paid out of 11 memory.
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gankoomonId)).toBe(
        true,
      );
      // All three named cards left the trash for the deck; the unrelated card stayed put.
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([unrelatedId]);
      const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
      expect(s.state.players[0]!.deck).toHaveLength(5);
      // The chosen end of the deck holds exactly the three returned cards.
      const landing = where === "top" ? deckIds.slice(0, 3) : deckIds.slice(-3);
      expect([...landing].sort()).toEqual([...returnedIds].sort());
      expect(s.state.players[0]!.hand).toHaveLength(0);
      // The token and the mandatory deletion still resolved on the reduced play.
      expect(tokenOf(s.state)).toHaveLength(1);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-039"]);
    },
  );

  it("refuses the reduction when only two matching cards sit in the trash (Q5322)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-057", as: "gankoomon" }],
          trash: [
            { card: NAMED_TRASH[0], as: "huckmon" },
            { card: NAMED_TRASH[1], as: "sistermon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const gankoomonId = s.inst("gankoomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: gankoomonId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);

    // The full 11 was paid: a partial return can never satisfy the "by" condition.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === gankoomonId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("huckmon").instanceId,
      s.inst("sistermon").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("pays the full cost when the return cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-057", as: "gankoomon" }],
          trash: [
            { card: NAMED_TRASH[0], as: "huckmon" },
            { card: NAMED_TRASH[1], as: "sistermon" },
            { card: NAMED_TRASH[2], as: "jesmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const gankoomonId = s.inst("gankoomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: gankoomonId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    // The token is the same "you may", so declining leaves the board with Gankoomon alone.
    expect(tokenOf(s.state)).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("deletes only up to the base play-cost ceiling of 6 when the token is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-057", as: "gankoomon" }], deck: ["BT1-010", "BT1-011"] },
        1: {
          battleArea: [
            { card: "BT1-041", as: "cost7" },
            { card: "BT1-039", as: "cost6" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const cost7Id = s.perm("cost7").permanentId;
    const cost6Id = s.perm("cost6").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(tokenOf(s.state)).toHaveLength(0);
    // Cost 7 is above the unraised ceiling of 6, so only the cost-6 Digimon could be chosen.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([cost7Id]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cost6Id)).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("raises the deletion ceiling by 3 for the token and by 3 for each other own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-057", as: "gankoomon" }],
          battleArea: [{ card: "BT1-009", as: "ally" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT10-112", as: "cost15" },
            { card: "BT13-017", as: "cost11" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const cost15Id = s.perm("cost15").permanentId;
    const cost11Id = s.perm("cost11").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    // Token (a Digimon) + the pre-existing ally => ceiling 6 + 3 + 3 = 12.
    const tokens = tokenOf(s.state);
    expect(tokens).toHaveLength(1);
    const token = tokens[0]!;
    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    // Cost 11 is inside the raised ceiling; cost 15 is not.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([cost15Id]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cost11Id)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });

  it("does not count a breeding-area Digimon toward the deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-057", as: "gankoomon" }],
          breeding: { card: "BT1-009", as: "inBreeding" },
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-041", as: "cost7" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const cost7Id = s.perm("cost7").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);

    // Breeding-area cards can't be referenced (comprehensive rules 3-4-5-8), so the ceiling stays 6.
    expect(tokenOf(s.state)).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([cost7Id]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("digivolves from a Lv.5 [CS] source for the alternate cost of 3 and draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-023", as: "base" }],
          hand: [{ card: "BT23-057", as: "gankoomon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-039", as: "cost6" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const cost6Id = s.perm("cost6").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    // Blue AeroVeedramon is not on the printed Black/Red evolution table, so cost 3 can only be
    // the [CS] alternate route. 4 - 3 = 1 memory, and the digivolve draw refills the hand.
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("gankoomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT22-023"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    // [When Digivolving] runs the same body: token, then the deletion.
    expect(tokenOf(s.state)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cost6Id)).toBe(false);
  });

  it("rejects a Lv.5 source without the [CS] trait on both routes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-041", as: "base" }],
          hand: [{ card: "BT23-057", as: "gankoomon" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT1-041");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("keeps the printed IR shape for the reduction and the token-then-delete body", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as unknown as {
      actions: unknown[];
    };
    const replacement = staticEffect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 5,
      cost: {
        kind: "return",
        to: "deckTopOrBottom",
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Huckmon", "Sistermon", "Jesmon"], match: "name" }],
          },
          count: 3,
        },
      },
    });

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as unknown as { actions: unknown[] })
        .actions;
      expect(actions[0]).toMatchObject({
        kind: "PlayToken",
        tokens: [
          {
            name: "Hinukamuy Token",
            keywords: [{ keyword: "Alliance" }, { keyword: "Reboot" }, { keyword: "Blocker" }],
          },
        ],
        count: 1,
        optional: true,
        payCost: false,
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 6 }, count: 1 },
        playCostCeiling: {
          base: 6,
          raise: 3,
          per: 1,
          unit: "cards",
          filter: { controller: "mine", zone: "battleArea", excludeSelf: true, kind: ["Digimon"] },
        },
        optional: false,
      });
    }
  });
});
