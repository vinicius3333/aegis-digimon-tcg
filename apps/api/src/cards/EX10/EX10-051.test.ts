import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-051.js";
import "../index.js";

const CARD_ID = "EX10-051";

/**
 * EX10-051 Mummymon (Lv.5 Purple/Black [Undead] Virus, play 6, DP 6000).
 *
 * "[On Play] By trashing 1 card in your hand, <De-Digivolve 1> 1 of your opponent's Digimon."
 * // The catalog stores a non-breaking space after "[Myotismon]" (U+00A0), not a plain space.
        "[On Deletion] You may play 1 Tamer card with [Myotismon]\u00A0in its text from your trash
 *  without paying the cost. This effect can't play cards with the same name as any of your
 *  Tamers."
 *
 * Every clause is driven from public intents: `playCard` from the hand for [On Play], and a
 * real losing battle for [On Deletion]. No injected timing is used anywhere in this file.
 */

/** Opponent board: a Lv.4 top over a Lv.3 source, so <De-Digivolve 1> has a legal step. */
const opponentStack = {
  battleArea: [{ card: "BT1-014", as: "target", under: [{ card: "BT1-013", as: "lower" }] }],
};

/** Opponent board for the deletion tests: a suspended 20000 DP wall Mummymon loses to. */
const opponentWall = {
  battleArea: [{ card: "BT1-014", as: "wall", dp: 20_000, suspended: true }],
  security: ["BT1-013"],
};

/**
 * Attack the suspended 20000 DP wall with the aliased permanent. The defender controls no
 * ＜Blocker＞, so the block window closes by itself and the battle resolves without a
 * `declineBlock` intent; the 6000 DP attacker is deleted in battle.
 */
async function attackIntoTheWall(s: ReturnType<typeof setupEngine>, attacker = "mummymon"): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
    }),
  ).toEqual({ ok: true });
}

describe("EX10-051 Mummymon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Mummymon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead"],
      effectText:
        "[On Play] By trashing 1 card in your hand, ＜De-Digivolve 1＞ 1 of your opponent's Digimon. \n" +
        // The catalog stores a non-breaking space after "[Myotismon]" (U+00A0), not a plain space.
        "[On Deletion] You may play 1 Tamer card with [Myotismon]\u00A0in its text from your trash without paying the cost. " +
        "This effect can't play cards with the same name as any of your Tamers.",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("compiles both printed clauses and nothing else", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              // Q5134: "[X] in its text" spans name, traits and every printed text field.
              nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }],
              excludeSameNameAsOwnTamers: true,
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("[On Play] from the hand: trashes exactly 1 hand card and demotes 1 opposing Digimon by 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "mummymon" },
            { card: "BT1-009", as: "cost" },
            { card: "BT1-013", as: "spare" },
          ],
        },
        1: opponentStack,
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mummymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("lower").instanceId);
    await settle(() => s.state.pendingDecision == null);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    // The play cost was paid publicly: 10 - 6 = 4. <De-Digivolve> itself costs no memory.
    expect(s.state.memory).toBe(4);
    // The Lv.4 top went to its owner's trash and the Lv.3 source is now the top card.
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("lower").instanceId);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(getCardDefinition("BT1-013")!.dp);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it("CR 15-7-2: declining the hand-trash condition also cancels the <De-Digivolve>", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "mummymon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: opponentStack,
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mummymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision == null);

    const p0 = s.state.players[0]!;
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(p0.trash).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT1-014");
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("lower").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it("[On Play] with an empty hand: no cost can be paid, so nothing is de-digivolved", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "mummymon" }] }, 1: opponentStack },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mummymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT1-014");
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("lower").instanceId]);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it("Q5134 [On Deletion] in battle: plays the Tamer whose only [Myotismon] is in its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mummymon" }],
          // BT16-089 "Arukenimon & Mummymon" also carries [Myotismon] in its text, but a Tamer
          // of that name is already in play, so the printed restriction must skip it and leave
          // EX10-065 "Yukio Oikawa" (Myotismon appears only inside its effect text) as the pick.
          trash: [
            { card: "BT16-089", as: "duplicate" },
            { card: "BT2-087", as: "unrelated" },
            { card: "EX10-065", as: "eligible" },
          ],
          hand: ["BT1-013"],
          security: ["BT1-013"],
        },
        1: opponentWall,
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Seeded separately so the Tamer is on the board before the trash candidates are filtered.
    s.putOnBoard(0, { card: "BT16-089", as: "existing" });
    s.state.memory = 3;
    await s.ready();
    const memoryBefore = s.state.memory;

    await attackIntoTheWall(s);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("eligible").instanceId),
    );
    await settle(() => s.state.pendingDecision == null);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["BT16-089", "EX10-065"]);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(s.inst("eligible").instanceId);
    // Played "without paying the cost": EX10-065 costs 4, and memory never moved for it.
    expect(s.state.memory).toBe(memoryBefore);
    // Same-name-as-own-Tamer and no-[Myotismon] candidates both stayed in the trash, next to
    // the deleted Mummymon itself.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("duplicate").instanceId, s.inst("unrelated").instanceId]),
    );
    expect(p0.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it('"You may": declining [On Deletion] leaves the eligible Tamer in the trash', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mummymon" }],
          trash: [{ card: "EX10-065", as: "eligible" }],
          hand: ["BT1-013"],
          security: ["BT1-013"],
        },
        1: opponentWall,
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackIntoTheWall(s);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle(() => s.state.pendingDecision == null);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it("[On Deletion] negative: a Tamer without [Myotismon] anywhere in its text is never played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mummymon" }],
          trash: [{ card: "BT2-087", as: "unrelated" }],
          hand: ["BT1-013"],
          security: ["BT1-013"],
        },
        1: opponentWall,
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackIntoTheWall(s);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));
    await settle(() => s.state.pendingDecision == null);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unrelated").instanceId);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it("evolution routes: the Black Lv.4 route costs 4, and an off-color Lv.4 source is refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "golemon" },
            { card: "BT1-014", as: "offColor" },
          ],
          hand: [
            { card: CARD_ID, as: "viaBlack" },
            { card: CARD_ID, as: "viaRed" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    // BT1-014 Kokatorimon is a RED Lv.4: it satisfies neither printed digivolution
    // requirement (Purple Lv.4 / Black Lv.4), so the intent is rejected outright.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("offColor").permanentId,
        instanceId: s.inst("viaRed").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("offColor").topCard.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(10);

    // BT10-062 Golemon is a BLACK Lv.4: the second printed route, same cost 4.
    const golemonInstanceId = s.inst("golemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("golemon").permanentId,
        instanceId: s.inst("viaBlack").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("golemon").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.memory).toBe(6);
    expect(s.perm("golemon").stack.map(({ instanceId }) => instanceId)).toEqual([golemonInstanceId]);
    expect(s.perm("golemon").currentDP).toBe(6000);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID, "BT1-013"]);
    expect(s.state.pendingDecision).toBeFalsy();
  });

  it("evolution stack: a Lv.4 Purple source digivolves into Mummymon for 4, and [On Deletion] still fires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "mummymon" }],
          deck: [{ card: "BT1-013", as: "drawn" }, "BT1-014"],
          trash: [{ card: "EX10-065", as: "eligible" }],
          security: ["BT1-013"],
        },
        1: opponentWall,
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const bakemonInstanceId = s.inst("bakemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("mummymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bakemon").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision == null);

    // Digivolution cost 4 from a Lv.4 Purple source, plus the digivolution draw.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.perm("bakemon").stack.map(({ instanceId }) => instanceId)).toEqual([bakemonInstanceId]);
    expect(s.perm("bakemon").currentDP).toBe(6000);
    // [On Play] does not fire on a digivolve, so nothing was trashed for a <De-Digivolve>.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("eligible").instanceId]);

    await attackIntoTheWall(s, "bakemon");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("eligible").instanceId),
    );
    await settle(() => s.state.pendingDecision == null);

    const p0 = s.state.players[0]!;
    // The whole stack left the field: top card and its digivolution card are both in the trash.
    expect(p0.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT4-080", CARD_ID]);
    expect(p0.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX10-065"]);
    expect(s.state.pendingDecision).toBeFalsy();
  });
});
