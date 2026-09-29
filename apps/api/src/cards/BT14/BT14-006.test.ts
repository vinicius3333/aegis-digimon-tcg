import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-006.js";

describe("BT14-006", () => {
  it("binds the paid, requirement-respecting digivolution to the trashed card", () =>
    expect(compiled.effects[0]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          actions: [
            { kind: "Digivolve", from: ["trash"], source: "triggerTrashedFromHand", payCost: true, optional: true },
          ],
        },
      ],
    }));

  it("digivolves only into the triggering trashed card and pays its normal cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "host", under: ["BT14-006"] }],
          trash: [
            { card: "BT14-072", as: "trigger" },
            { card: "BT14-074", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT14-072",
      trashedFromHandInstanceId: s.inst("trigger").instanceId,
      handTrashedSeat: 0,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT14-072");
    expect(s.perm("host").topCard.cardId).toBe("BT14-072");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-074"]);
    assertNoLoudGap(s);
  });

  it("reacts to a real hand-trash effect and evolves into the card that was trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "host", under: ["BT14-006"] }],
          hand: [{ card: "BT14-072", as: "fifteen" }],
          trash: [{ card: "BT14-074", as: "trigger" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fifteen").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT14-074");

    expect(s.perm("host").topCard.cardId).toBe("BT14-074");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT14-006", "BT14-071"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not evolve a breeding host or bypass the triggering card's level requirement", async () => {
    const breeding = setupEngine(
      {
        0: {
          breeding: { card: "BT14-071", as: "host", under: ["BT14-006"] },
          trash: [{ card: "BT14-072", as: "trigger" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await breeding.ready();
    await advance(breeding.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT14-072",
      trashedFromHandInstanceId: breeding.inst("trigger").instanceId,
      handTrashedSeat: 0,
    });
    await settle();
    expect(breeding.perm("host").topCard.cardId).toBe("BT14-071");

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "host", under: ["BT14-006"] }],
          trash: [{ card: "BT14-078", as: "trigger" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await invalid.ready();
    await advance(invalid.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT14-078",
      trashedFromHandInstanceId: invalid.inst("trigger").instanceId,
      handTrashedSeat: 0,
    });
    await settle();
    expect(invalid.perm("host").topCard.cardId).toBe("BT14-071");
    assertNoLoudGap(breeding);
    assertNoLoudGap(invalid);
  });
});

describe("BT14-006 Bowmon — KB Q&A rulings", () => {
  const LOOGAMON = "BT14-071";
  const FANGMON = "BT14-072";
  const LOOGARMON = "BT14-074";
  const HELLOOGARMON = "BT14-078";

  function setupFangmonDiscard(host: "battleArea" | "breeding", returnedCard: string) {
    const hostSpec = { card: LOOGAMON, as: "host", under: ["BT14-006"] };
    return setupEngine(
      {
        0: {
          ...(host === "battleArea" ? { battleArea: [hostSpec] } : { breeding: hostSpec }),
          hand: [{ card: FANGMON, as: "fangmon" }],
          trash: [{ card: returnedCard, as: "trashed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
  }

  async function playFangmonAndDiscard(s: ReturnType<typeof setupFangmonDiscard>): Promise<string[]> {
    const trashedFromHand: string[] = [];
    await observe(s.engine).captureSubTriggers(
      async () => {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmon").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => trashedFromHand.length > 0);
        await drainMicrotasks();
      },
      (event, payload) => {
        if (event === "whenTrashedFromHand" && payload.trashedFromHandCardId !== undefined) {
          trashedFromHand.push(payload.trashedFromHandCardId);
        }
      },
    );
    return trashedFromHand;
  }

  it("does not digivolve a Digimon in the breeding area into the card trashed from hand (Q2370)", async () => {
    const breeding = setupFangmonDiscard("breeding", LOOGARMON);
    expect(await playFangmonAndDiscard(breeding)).toEqual([LOOGARMON]);
    expect(breeding.perm("host").inBreeding).toBe(true);
    expect(breeding.perm("host").topCard.cardId).toBe(LOOGAMON);
    expect(breeding.state.players[0]!.trash.map((card) => card.cardId)).toEqual([LOOGARMON]);
    assertNoLoudGap(breeding);

    const battle = setupFangmonDiscard("battleArea", LOOGARMON);
    await playFangmonAndDiscard(battle);
    await settle(() => battle.perm("host").topCard.cardId === LOOGARMON);
    expect(battle.perm("host").topCard.cardId).toBe(LOOGARMON);
  });

  it("only digivolves into a trashed card whose digivolution requirements the Digimon meets (Q2371)", async () => {
    const levelFive = setupFangmonDiscard("battleArea", HELLOOGARMON);
    expect(await playFangmonAndDiscard(levelFive)).toEqual([HELLOOGARMON]);
    expect(levelFive.perm("host").topCard.cardId).toBe(LOOGAMON);
    expect(levelFive.state.players[0]!.trash.map((card) => card.cardId)).toEqual([HELLOOGARMON]);
    assertNoLoudGap(levelFive);

    const levelFour = setupFangmonDiscard("battleArea", LOOGARMON);
    await playFangmonAndDiscard(levelFour);
    await settle(() => levelFour.perm("host").topCard.cardId === LOOGARMON);
    expect(levelFour.perm("host").topCard.cardId).toBe(LOOGARMON);
  });

  it("pays the digivolution cost when digivolving into the trashed card (Q2372)", async () => {
    const s = setupFangmonDiscard("battleArea", LOOGARMON);
    s.state.memory = 10;
    await playFangmonAndDiscard(s);
    await settle(() => s.perm("host").topCard.cardId === LOOGARMON);

    expect(s.perm("host").topCard.cardId).toBe(LOOGARMON);
    const fangmonPlayCost = 4;
    const loogarmonDigivolveCost = 2;
    expect(s.state.memory).toBe(10 - fangmonPlayCost - loogarmonDigivolveCost);
    assertNoLoudGap(s);
  });
});
