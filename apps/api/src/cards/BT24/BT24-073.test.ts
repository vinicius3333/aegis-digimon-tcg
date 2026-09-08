import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_073 } from "./BT24-073.js";
import "../index.js";

function milledInstanceIds(s: ReturnType<typeof setupEngine>, expected: string[]): string[] {
  const expectedSet = new Set(expected);
  return s.events
    .flatMap((event) => (event.kind === "cardsMoved" && event.to === "trash" ? event.instanceIds : []))
    .filter((instanceId) => expectedSet.has(instanceId));
}

describe("BT24-073 SkullSatamon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-073")).toMatchObject({
      cardId: "BT24-073",
      nameEn: "SkullSatamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Fallen Angel"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("makes the inherited Security Attack bonus an alternative to milling", () => {
    const inherited = BT24_073.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      condition: { kind: "not", condition: { kind: "zoneCount", zone: "trash", op: "lte", value: 10 } },
    });
    expect(inherited?.actions?.[1]).toMatchObject({
      kind: "TrashTopDeck",
      controller: "both",
      amount: 2,
    });
  });

  it.each([EffectTiming.WhenDigivolving, EffectTiming.OnDeletion])(
    "mills both decks and then revives after reaching 10 opposing trash cards on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-073", as: "skullsatamon" }],
            deck: [
              { card: "BT1-013", as: "ownMillFirst" },
              { card: "BT1-015", as: "ownMillSecond" },
              { card: "BT1-045", as: "ownMillThird" },
            ],
            trash: [{ card: "BT11-080", as: "revive" }],
          },
          1: {
            deck: [
              { card: "BT1-009", as: "opponentMillFirst" },
              { card: "BT1-011", as: "opponentMillSecond" },
              { card: "BT1-014", as: "opponentMillThird" },
            ],
            trash: Array.from({ length: 8 }, () => "BT1-013"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("skullsatamon"));
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId,
        ),
      );

      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.state.players[1]!.deck).toHaveLength(0);
      expect(s.state.players[1]!.trash).toHaveLength(11);
      expect(
        milledInstanceIds(s, [
          s.inst("ownMillFirst").instanceId,
          s.inst("ownMillSecond").instanceId,
          s.inst("ownMillThird").instanceId,
        ]),
      ).toEqual([
        s.inst("ownMillFirst").instanceId,
        s.inst("ownMillSecond").instanceId,
        s.inst("ownMillThird").instanceId,
      ]);
      expect(
        milledInstanceIds(s, [
          s.inst("opponentMillFirst").instanceId,
          s.inst("opponentMillSecond").instanceId,
          s.inst("opponentMillThird").instanceId,
        ]),
      ).toEqual([
        s.inst("opponentMillFirst").instanceId,
        s.inst("opponentMillSecond").instanceId,
        s.inst("opponentMillThird").instanceId,
      ]);
    },
  );

  it.each([6, 7, 10, 11])("public evolution handles opponent trash threshold %s", async (initialTrash) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "base" }],
          hand: [{ card: "BT24-073", as: "skullsatamon" }],
          deck: [
            { card: "BT1-011", as: "bonusDraw" },
            { card: "BT1-013", as: "ownMillFirst" },
            { card: "BT1-015", as: "ownMillSecond" },
            { card: "BT1-045", as: "ownMillThird" },
            { card: "BT1-009", as: "ownUntouched" },
          ],
          trash: [{ card: "BT11-080", as: "revive" }],
        },
        1: {
          deck: [
            { card: "BT1-009", as: "opponentMillFirst" },
            { card: "BT1-011", as: "opponentMillSecond" },
            { card: "BT1-014", as: "opponentMillThird" },
            { card: "BT1-015", as: "opponentUntouched" },
          ],
          trash: Array.from({ length: initialTrash }, () => "BT1-013"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullsatamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("bonusDraw").instanceId),
      ),
    );
    await settle(() => !s.state.pendingDecision);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("skullsatamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      initialTrash <= 10
        ? [s.inst("ownUntouched").instanceId]
        : [
            s.inst("ownMillFirst").instanceId,
            s.inst("ownMillSecond").instanceId,
            s.inst("ownMillThird").instanceId,
            s.inst("ownUntouched").instanceId,
          ],
    );
    expect(s.state.players[1]!.trash).toHaveLength(initialTrash <= 10 ? initialTrash + 3 : initialTrash);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(
      initialTrash <= 10
        ? [s.inst("opponentUntouched").instanceId]
        : [
            s.inst("opponentMillFirst").instanceId,
            s.inst("opponentMillSecond").instanceId,
            s.inst("opponentMillThird").instanceId,
            s.inst("opponentUntouched").instanceId,
          ],
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      initialTrash <= 10
        ? expect.arrayContaining([
            s.inst("ownMillFirst").instanceId,
            s.inst("ownMillSecond").instanceId,
            s.inst("ownMillThird").instanceId,
          ])
        : expect.not.arrayContaining([s.inst("ownMillFirst").instanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      initialTrash <= 10
        ? expect.arrayContaining([
            s.inst("opponentMillFirst").instanceId,
            s.inst("opponentMillSecond").instanceId,
            s.inst("opponentMillThird").instanceId,
          ])
        : expect.not.arrayContaining([s.inst("opponentMillFirst").instanceId]),
    );
    const revived = s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId,
    );
    expect(revived).toBe(initialTrash >= 7);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).includes(s.inst("revive").instanceId)).toBe(
      initialTrash < 7,
    );
  });

  it.each([true, false])("public opponent deletion mills and %s revival", async (acceptRevival) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-073", as: "skullsatamon" }],
          deck: [
            { card: "BT1-013", as: "ownMillFirst" },
            { card: "BT1-015", as: "ownMillSecond" },
            { card: "BT1-045", as: "ownMillThird" },
            { card: "BT1-009", as: "ownUntouched" },
          ],
          trash: [{ card: "BT11-080", as: "revive" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          hand: [{ card: "BT6-095", as: "deletionOption" }],
          deck: [
            { card: "BT1-009", as: "opponentMillFirst" },
            { card: "BT1-011", as: "opponentMillSecond" },
            { card: "BT1-014", as: "opponentMillThird" },
            { card: "BT1-015", as: "opponentUntouched" },
          ],
          trash: Array.from({ length: 7 }, () => "BT1-013"),
        },
      },
      { autoAcceptOptional: acceptRevival, autoSelectCards: acceptRevival },
    );
    const originalId = s.perm("skullsatamon").permanentId;
    const skullId = s.inst("skullsatamon").instanceId;
    const optionId = s.inst("deletionOption").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({
      ok: true,
    });
    if (!acceptRevival) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decision = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    }
    await settle(
      () => !s.state.pendingDecision && s.state.players[1]!.trash.some((card) => card.instanceId === optionId),
    );

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("ownUntouched").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === originalId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).includes(skullId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("revive").instanceId)).toBe(
      acceptRevival,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).includes(s.inst("revive").instanceId)).toBe(
      !acceptRevival,
    );
    if (acceptRevival) {
      expect(
        s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("revive").instanceId)?.permanentId,
      ).not.toBe(originalId);
    }
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("ownUntouched").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("opponentUntouched").instanceId]);
    expect(
      milledInstanceIds(s, [
        s.inst("ownMillFirst").instanceId,
        s.inst("ownMillSecond").instanceId,
        s.inst("ownMillThird").instanceId,
      ]),
    ).toEqual([
      s.inst("ownMillFirst").instanceId,
      s.inst("ownMillSecond").instanceId,
      s.inst("ownMillThird").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("opponentMillFirst").instanceId,
        s.inst("opponentMillSecond").instanceId,
        s.inst("opponentMillThird").instanceId,
      ]),
    );
  });

  it("inherited attack mills both decks instead of the Security Attack bonus at 10 opposing trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "BT24-073", as: "inherited" }] }],
        deck: [
          { card: "BT1-013", as: "ownMillFirst" },
          { card: "BT1-015", as: "ownMillSecond" },
          { card: "BT1-045", as: "ownUntouched" },
        ],
        security: [
          { card: "BT1-009", as: "ownSecurity1" },
          { card: "BT1-011", as: "ownSecurity2" },
          { card: "BT1-014", as: "ownSecurity3" },
        ],
      },
      1: {
        deck: [
          { card: "BT1-013", as: "opponentMillFirst" },
          { card: "BT1-015", as: "opponentMillSecond" },
          { card: "BT1-009", as: "opponentUntouched" },
        ],
        security: [
          { card: "BT1-010", as: "security1" },
          { card: "BT1-011", as: "security2" },
          { card: "BT1-012", as: "security3" },
        ],
        trash: Array.from({ length: 10 }, () => "BT1-013"),
      },
    });
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("inherited").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("ownUntouched").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("opponentUntouched").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("security2").instanceId,
      s.inst("security3").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("opponentMillFirst").instanceId, s.inst("opponentMillSecond").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("ownMillFirst").instanceId, s.inst("ownMillSecond").instanceId]),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.events.find((event) => event.kind === "securityChecked")?.revealedCardId).toBe("BT1-010");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security1").instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("inherited attack grants Security Attack +1 instead of milling above 10 opposing trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "BT24-073", as: "inherited" }] }],
        deck: [
          { card: "BT1-013", as: "ownUntouched1" },
          { card: "BT1-015", as: "ownUntouched2" },
        ],
      },
      1: {
        deck: [
          { card: "BT1-045", as: "opponentUntouched1" },
          { card: "BT1-009", as: "opponentUntouched2" },
        ],
        security: [
          { card: "BT1-014", as: "security1" },
          { card: "BT1-013", as: "security2" },
          { card: "BT1-015", as: "security3" },
        ],
        trash: Array.from({ length: 11 }, () => "BT1-011"),
      },
    });
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("inherited").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("ownUntouched1").instanceId,
      s.inst("ownUntouched2").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("opponentUntouched1").instanceId,
      s.inst("opponentUntouched2").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("ownUntouched1").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(
      s.inst("opponentUntouched1").instanceId,
    );
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("security3").instanceId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.events.filter((event) => event.kind === "securityChecked").map((event) => event.revealedCardId)).toEqual([
      "BT1-014",
      "BT1-013",
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("security1").instanceId, s.inst("security2").instanceId]),
    );
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("suppresses same-turn inherited milling and resets on the next owner attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "BT24-073", as: "inherited" }] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: [
            { card: "BT1-009", as: "ownerDraw1" },
            { card: "BT1-013", as: "ownerMill1" },
            { card: "BT1-015", as: "ownerMill2" },
            { card: "BT1-045", as: "ownerDraw2" },
            { card: "BT1-009", as: "ownerRemain2" },
            { card: "BT1-011", as: "ownerRemain3" },
          ],
        },
        1: {
          deck: [
            { card: "BT1-009", as: "opponentDraw1" },
            { card: "BT1-013", as: "opponentMill1" },
            { card: "BT1-015", as: "opponentMill2" },
            { card: "BT1-009", as: "opponentRemain2" },
            { card: "BT1-011", as: "opponentRemain3" },
            { card: "BT1-012", as: "opponentRemain4" },
          ],
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "secondTarget", suspended: true, dp: 1000 },
          ],
          security: [
            { card: "BT1-014", as: "security1" },
            { card: "BT1-015", as: "security2" },
            { card: "BT1-013", as: "security3" },
          ],
          trash: Array.from({ length: 6 }, () => "BT1-013"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const hostTopId = s.perm("host").topCard.instanceId;
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("inherited").instanceId]);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const firstTargetId = s.perm("firstTarget").permanentId;
    const firstOwnerDeck = s.state.players[0]!.deck.length;
    const firstOpponentDeck = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(firstOwnerDeck - 2);
    expect(s.state.players[1]!.deck).toHaveLength(firstOpponentDeck - 2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("ownerMill2").instanceId,
      s.inst("ownerDraw2").instanceId,
      s.inst("ownerRemain2").instanceId,
      s.inst("ownerRemain3").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("opponentMill2").instanceId,
      s.inst("opponentRemain2").instanceId,
      s.inst("opponentRemain3").instanceId,
      s.inst("opponentRemain4").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(9);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("ownerDraw1").instanceId, s.inst("ownerMill1").instanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("opponentDraw1").instanceId, s.inst("opponentMill1").instanceId]),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstTargetId)).toBe(false);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([
      s.inst("security1").instanceId,
      s.inst("security2").instanceId,
      s.inst("security3").instanceId,
    ]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(3);
    const secondTargetId = s.perm("secondTarget").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondTargetId)).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    expect(s.state.players[0]!.deck).toHaveLength(firstOwnerDeck - 2);
    expect(s.state.players[1]!.deck).toHaveLength(firstOpponentDeck - 2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("ownerMill2").instanceId,
      s.inst("ownerDraw2").instanceId,
      s.inst("ownerRemain2").instanceId,
      s.inst("ownerRemain3").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("opponentMill2").instanceId,
      s.inst("opponentRemain2").instanceId,
      s.inst("opponentRemain3").instanceId,
      s.inst("opponentRemain4").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ownerMill2").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentMill2").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("ownerMill2").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("opponentMill2").instanceId);
    const secondOwnerDeck = s.state.players[0]!.deck.length;
    const secondOpponentDeck = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(secondOwnerDeck - 2);
    expect(s.state.players[1]!.deck).toHaveLength(secondOpponentDeck - 2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("ownerRemain3").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("opponentRemain4").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(13);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.events.find((event) => event.kind === "securityChecked")?.revealedCardId).toBe("BT1-014");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security1").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(hostTopId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("inherited").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });
});
