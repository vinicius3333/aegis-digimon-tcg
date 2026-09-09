import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT17-078.js";
import { compiled } from "./BT17-015.js";

describe("BT17-015", () => {
  it("reduces its play cost by 3 when you have a Tai Kamiya Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, condition: { kind: "youHave" } }],
        },
      ],
    });
  });

  it("offers deletion or free MetalGarurumon digivolution on play and digivolution", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "Delete" }],
          [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
              optional: true,
              allowNoTarget: true,
              target: { filter: { kind: ["Digimon"] } },
              into: { kind: ["Digimon"] },
            },
          ],
        ],
      });
    }
  });

  it("reduces the natural play cost with Tai Kamiya and deletes an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-015", as: "warGreymon" }],
          battleArea: [{ card: "BT1-085", as: "tai" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-015"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("naturally free-digivolves a Gabumon into MetalGarurumon through the second modal branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-015", as: "warGreymon" },
            { card: "BT1-044", as: "metalGarurumon" },
          ],
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gabumon").topCard.cardId === "BT1-044");

    expect(s.perm("gabumon").stack.map(({ cardId }) => cardId)).toContain("BT1-029");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT1-044");
    expect(s.state.memory).toBe(0);
  });

  it("allows the optional Gabumon branch to end without a target (Q2743)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-015", as: "warGreymon" }] } },
      { autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-015"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("trashes opponent security as inherited when it has Omnimon in its name", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "selfHasNameContaining" },
        },
      ],
    });
  });

  it("trashes one security card when an Omnimon host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-078", as: "host", under: ["BT17-015"] }] },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    // The inherited effect trashes one card, then the attack's normal check removes the
    // remaining security card.
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("matches the catalog printed text, costs and compiled requirement", () => {
    const definition = getCardDefinition("BT17-015")!;
    expect(definition).toMatchObject({
      nameEn: "WarGreymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
    });
    expect(definition.effectText).toBe(
      "[Digivolve]Lv.5 w/[Greymon]\u00a0in its name: Cost 3 \n\n" +
        "When this card would be played, if you have a Tamer with [Tai Kamiya]\u00a0in its name, reduce the play cost by 3.\n" +
        "[On Play] [When Digivolving] Activate 1 of the effects below:\n" +
        "・Delete 1 of your opponent's Digimon with 8000 DP or less.\n" +
        "・1 of your [Gabumon] may digivolve into [MetalGarurumon] in your hand, ignoring its digivolution requirements and without paying the cost.",
    );
    expect(definition.inheritedEffectText).toBe(
      "[When Attacking] [Once Per Turn] If this Digimon has [Omnimon]\u00a0in its name, trash the top card of your opponent's security stack.",
    );
    // The printed route says "in its name", so the compiled requirement is the substring form.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Greymon"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays the full 11 without a Tai Kamiya Tamer, and is not fooled by another Kamiya Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-015", as: "warGreymon" }],
          battleArea: [{ card: "BT4-097", as: "kari" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-015"));

    // "Kari Kamiya" contains "Kamiya" but not "Tai Kamiya": no reduction, so all 11 memory is spent.
    expect(s.state.memory).toBe(0);
  });

  it("deletes only an opposing Digimon at or below 8000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-015", as: "warGreymon" }],
          battleArea: [{ card: "BT1-085", as: "tai" }],
        },
        1: {
          battleArea: [
            { card: "BT10-065", as: "tenThousand" },
            { card: "BT10-064", as: "eightThousand" },
          ],
        },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const eightThousandId = s.perm("eightThousand").permanentId;

    expect(getCardDefinition("BT10-065")!.dp).toBe(10_000);
    expect(getCardDefinition("BT10-064")!.dp).toBe(8000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(eightThousandId);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT10-065");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT10-064"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly digivolves from a red Lv5 through the catalog route for 3, with the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "BT17-015", as: "warGreymon" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("warGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").topCard.cardId).toBe("BT17-015");
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    // [When Digivolving] shares the [On Play] modal: the 3000 DP Digimon is deleted.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("publicly digivolves from an off-color Lv5 through the printed [Greymon] route for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-063", as: "blackMetalGreymon" }],
          hand: [{ card: "BT17-015", as: "warGreymon" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.inst("blackMetalGreymon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackMetalGreymon").permanentId,
        instanceId: s.inst("warGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackMetalGreymon").topCard.cardId === "BT17-015");

    // The black source has no red Lv5 evoCost match, so only the printed route can pay.
    expect(s.state.memory).toBe(0);
    expect(s.perm("blackMetalGreymon").stack.map((card) => card.instanceId)).toEqual([sourceId]);
  });

  it("refuses a Lv5 source without [Greymon] in its name on either route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-042", as: "loaderLeomon" }],
        hand: [{ card: "BT17-015", as: "warGreymon" }],
        deck: [{ card: "BT1-010", as: "spare" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    for (const useAlternateCost of [false, true]) {
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("loaderLeomon").permanentId,
        instanceId: s.inst("warGreymon").instanceId,
        useAlternateCost,
      });
      expect(result.ok).toBe(false);
    }
    expect(s.perm("loaderLeomon").topCard.cardId).toBe("BT1-042");
    expect(s.state.memory).toBe(5);
  });

  it("does not trash security when the inherited host has no Omnimon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-024", as: "host", under: ["BT17-015"] }],
        hand: [{ card: "BT1-010", as: "spare" }],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);

    // Only the attack's own security check removed a card.
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("trashes security once per turn and resets on its next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-078", as: "host", under: ["BT17-015"] }],
        hand: [{ card: "BT1-010", as: "spare" }],
        deck: [
          { card: "BT1-010", as: "deckA" },
          { card: "BT1-011", as: "deckB" },
        ],
      },
      1: {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: [{ card: "BT1-010", as: "oppDeck" }],
        hand: [{ card: "BT1-010", as: "oppSpare" }],
      },
    });
    await s.ready();
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    expect(attackPlayer()).toEqual({ ok: true });
    // Inherited trash (1) plus the attack's security check (1).
    await settle(() => s.state.players[1]!.security.length === 4);
    expect(s.state.players[1]!.security).toHaveLength(4);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attackPlayer()).toEqual({ ok: true });
    // [Once Per Turn] is spent, so only the security check removes a card.
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.state.players[1]!.security).toHaveLength(3);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
