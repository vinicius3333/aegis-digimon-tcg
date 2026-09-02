import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-069.js";
import "../index.js";

const CARD_ID = "EX10-069";

describe("EX10-069 Unique Emblem: Gravel Hearts", () => {
  it("records the exact catalog and intrinsic Delay contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Unique Emblem: Gravel Hearts",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 3,
      types: ["LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Sunarizamon", "Close"], match: "name" }] } },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Close"], match: "name" }] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
              optional: true,
              target: {
                filter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
              },
              // Q5183 needs BOTH traits: `traits` alone is OR-matched, so the conjunction is
              // encoded as the separate `nameOrTrait` and `traits` gates.
              into: { nameOrTrait: [{ tokens: ["Mineral"], match: "trait" }], traits: ["LIBERATOR"] },
            },
          ],
        },
      ],
      // The printed ＜Delay＞ is the encoding; `delayArmedIntrinsic` is synthesized onto the
      // SubTrigger by `withIntrinsicDelayGate` at registration, never carried in the IR.
      keywords: [{ keyword: "Delay" }],
    });
  });

  it("mandatorily places itself even when the optional Main play is declined", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "emblem" }], hand: [{ card: "EX10-025", as: "sunarizamon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX10-025");
  });

  it("trashes itself as intrinsic Delay when Close suspends and evolves a Mineral/Rock host for cost reduced by 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "emblem" },
            { card: "EX10-063", as: "close" },
            { card: "EX10-025", as: "mineral" },
          ],
          hand: [{ card: "EX8-048", as: "landramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("close").permanentId });
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.perm("mineral").topCard.cardId).toBe("EX8-048");
    expect(s.state.memory).toBe(0);
  });

  it("Q5183 rejects a hand Digimon missing either required trait and leaves Delay unspent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "emblem" },
            { card: "EX10-063", as: "close" },
            { card: "EX10-025", as: "mineral" },
          ],
          hand: ["EX10-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("close").permanentId });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.perm("mineral").topCard.cardId).toBe("EX10-025");
  });

  it("Q5183 rejects a Mineral-only hand Digimon that lacks [LIBERATOR]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "emblem" },
            { card: "EX10-063", as: "close" },
            { card: "EX10-025", as: "mineral" },
          ],
          // BT7-061 Gigasmon: black Lv.4, [Mineral] but NOT [LIBERATOR], and a legal
          // black Lv.3 evolution route off Sunarizamon — so only the trait conjunction
          // can reject it.
          hand: ["BT7-061"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("close").permanentId });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.perm("mineral").topCard.cardId).toBe("EX10-025");
  });

  it("Q5183 rejects a LIBERATOR-only hand Digimon that lacks [Mineral]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "emblem" },
            { card: "EX10-063", as: "close" },
            { card: "EX10-025", as: "mineral" },
          ],
          // BT18-065 Snatchmon: black Lv.4, [LIBERATOR] but NOT [Mineral].
          hand: ["BT18-065"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("close").permanentId });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.perm("mineral").topCard.cardId).toBe("EX10-025");
  });

  it("ignores suspension of a non-Close card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "emblem" },
          { card: "EX10-025", as: "ordinary" },
        ],
      },
    });
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("ordinary").permanentId,
    });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });

  it("Security activates the Main effect", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "emblem" }], hand: ["EX10-025"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX10-025", CARD_ID]);
  });
});
