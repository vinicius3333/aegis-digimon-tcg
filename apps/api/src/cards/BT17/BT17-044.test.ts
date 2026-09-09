import { describe, expect, it } from "vitest";
import { Zone, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-044.js";
import "./index.js";
import "../BT6/BT6-047.js";

const EOSMON_NAME_REF = [{ tokens: ["Eosmon"], match: "nameExact" }];

describe("BT17-044 Morphomon", () => {
  it("matches the catalog identity, printed text and the complete IR contract", () => {
    expect(getCardDefinition("BT17-044")).toMatchObject({
      cardId: "BT17-044",
      nameEn: "Morphomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Insectoid"],
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      effectText: "[Your Turn] When this Digimon would digivolve into [Eosmon], reduce the digivolution cost by 1.",
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When another [Eosmon] is played, this Digimon may digivolve into [Eosmon] in your hand with the digivolution cost Reduced by 3.",
    });

    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true },
            into: { controllerDefault: "mine", nameOrTrait: EOSMON_NAME_REF },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: { controllerDefault: "mine", excludeSelf: true, nameOrTrait: EOSMON_NAME_REF },
            actions: [
              {
                kind: "Digivolve",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                payCost: true,
                into: { controllerDefault: "mine", nameOrTrait: EOSMON_NAME_REF },
                from: ["hand"],
                reduceCost: 3,
                optional: true,
              },
            ],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reduces its own [Eosmon] digivolution from 2 memory to 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-044", as: "morphomon" }],
        hand: [
          { card: "BT17-074", as: "eosmon" },
          { card: "BT1-009", as: "spare" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("morphomon").permanentId,
        instanceId: s.inst("eosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("morphomon").topCard.instanceId === s.inst("eosmon").instanceId);
    await settle();

    expect(s.state.memory).toBe(4);
    expect(s.perm("morphomon").stack.map((card) => card.cardId)).toEqual(["BT17-044"]);
    // The spare, plus the one card the digivolution bonus draw added.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces the [Eosmon] digivolution by exactly 1 versus a plain Morphomon control", async () => {
    async function digivolveIntoEosmon(sourceCardId: string): Promise<number> {
      const s = setupEngine({
        0: {
          battleArea: [{ card: sourceCardId, as: "morphomon" }],
          hand: [
            { card: "BT17-074", as: "eosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("morphomon").permanentId,
          instanceId: s.inst("eosmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("morphomon").topCard.instanceId === s.inst("eosmon").instanceId);
      await settle();

      expect(s.perm("morphomon").topCard.cardId).toBe("BT17-074");
      return 5 - s.state.memory;
    }

    // BT6-047 is a plain Morphomon (only an [On Deletion] effect): the control.
    const controlCost = await digivolveIntoEosmon("BT6-047");
    const reducedCost = await digivolveIntoEosmon("BT17-044");

    expect(controlCost).toBe(2);
    expect(reducedCost).toBe(1);
    expect(controlCost - reducedCost).toBe(1);
  });

  it("does not reduce a digivolution into a Digimon that is not named [Eosmon]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-044", as: "morphomon" }],
        hand: [
          { card: "BT17-046", as: "gargomon" },
          { card: "BT1-009", as: "spare" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("morphomon").permanentId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("morphomon").topCard.instanceId === s.inst("gargomon").instanceId);
    await settle();

    expect(s.state.memory).toBe(3);
  });

  it("digivolves the host into a hand [Eosmon] for 3 less when another [Eosmon] is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-044"], as: "host" }],
          hand: [
            { card: "BT17-074", as: "playedEosmon" },
            { card: "BT17-075", as: "evolvedEosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const evolvedEosmonId = s.inst("evolvedEosmon").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.instanceId === evolvedEosmonId);
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("BT17-075");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-044", "BT17-074"]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === evolvedEosmonId)).toBe(false);
    // 6 memory - 4 to play the second Eosmon - (3 - 3) for the reduced digivolution.
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire when the opponent plays their own [Eosmon] on their own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-044"], as: "host" }],
          hand: [
            { card: "BT17-075", as: "evolvedEosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: [
            { card: "BT17-074", as: "opponentEosmon" },
            { card: "BT1-009", as: "opponentSpare" },
          ],
          deck: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const evolvedEosmonId = s.inst("evolvedEosmon").instanceId;
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 6;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("opponentEosmon").instanceId,
      ),
    );
    await settle();

    // Not mine and not my turn: neither the controller nor the [Your Turn] gate passes.
    expect(s.perm("host").topCard?.cardId).toBe("BT17-074");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-044"]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === evolvedEosmonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    s.engine.applyIntent(1, { type: "endPhase" });
    await opponentTurn;
  });

  it("leaves memory and the stack untouched when the inherited digivolve is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-044"], as: "host" }],
          hand: [
            { card: "BT17-074", as: "playedEosmon" },
            { card: "BT17-075", as: "evolvedEosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const evolvedEosmonId = s.inst("evolvedEosmon").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("playedEosmon").instanceId,
      ),
    );
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("BT17-074");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-044"]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === evolvedEosmonId)).toBe(true);
    // Only the 4 memory the play itself cost.
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still obeys the digivolution requirements of the hand [Eosmon], per Q2798", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-044"], as: "host" }],
          hand: [
            { card: "BT17-074", as: "playedEosmon" },
            // Lv6 Eosmon: requires a Lv5 [Eosmon] source, which the Lv4 host is not.
            { card: "BT17-076", as: "illegalEosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const illegalId = s.inst("illegalEosmon").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("playedEosmon").instanceId,
      ),
    );
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("BT17-074");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-044"]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === illegalId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires the inherited digivolve once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-044"], as: "host" }],
          hand: [
            { card: "BT17-074", as: "firstPlay" },
            { card: "BT17-075", as: "evolvedEosmon" },
            { card: "BT17-074", as: "secondPlay" },
            { card: "BT17-076", as: "lastEosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013", "BT1-013"], hand: ["BT1-009"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const evolvedEosmonId = s.inst("evolvedEosmon").instanceId;
    const lastEosmonId = s.inst("lastEosmon").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.instanceId === evolvedEosmonId);
    await settle();
    expect(s.perm("host").topCard?.cardId).toBe("BT17-075");
    expect(s.state.memory).toBe(6);

    // The host is now a Lv5 [Eosmon], so BT17-076 is a legal route — but the effect is spent.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("secondPlay").instanceId,
      ),
    );
    await settle();
    expect(s.perm("host").topCard?.instanceId).toBe(evolvedEosmonId);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === lastEosmonId)).toBe(true);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 6;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const thirdPlay = s.give(0, Zone.Hand, { card: "BT17-074", as: "thirdPlay" });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: thirdPlay.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === lastEosmonId);

    expect(s.perm("host").topCard?.cardId).toBe("BT17-076");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-044", "BT17-074", "BT17-075"]);
    s.engine.applyIntent(0, { type: "endPhase" });
    await nextOwnTurn;
  });
});
