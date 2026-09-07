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
      expect(milledInstanceIds(s, [s.inst("ownMillFirst").instanceId, s.inst("ownMillSecond").instanceId, s.inst("ownMillThird").instanceId])).toEqual([
        s.inst("ownMillFirst").instanceId,
        s.inst("ownMillSecond").instanceId,
        s.inst("ownMillThird").instanceId,
      ]);
      expect(milledInstanceIds(s, [s.inst("opponentMillFirst").instanceId, s.inst("opponentMillSecond").instanceId, s.inst("opponentMillThird").instanceId])).toEqual([
        s.inst("opponentMillFirst").instanceId,
        s.inst("opponentMillSecond").instanceId,
        s.inst("opponentMillThird").instanceId,
      ]);
    },
  );

  it("public evolution pays 3, mills both decks, and revives after crossing 10 opposing trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "base" }],
          hand: [{ card: "BT24-073", as: "skullsatamon" }],
          deck: [
            { card: "BT1-011", as: "ownDeckFiller" },
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
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullsatamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId),
    );

    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(milledInstanceIds(s, [s.inst("ownMillFirst").instanceId, s.inst("ownMillSecond").instanceId, s.inst("ownMillThird").instanceId])).toEqual([
      s.inst("ownMillFirst").instanceId,
      s.inst("ownMillSecond").instanceId,
      s.inst("ownMillThird").instanceId,
    ]);
    expect(milledInstanceIds(s, [s.inst("opponentMillFirst").instanceId, s.inst("opponentMillSecond").instanceId, s.inst("opponentMillThird").instanceId])).toEqual([
      s.inst("opponentMillFirst").instanceId,
      s.inst("opponentMillSecond").instanceId,
      s.inst("opponentMillThird").instanceId,
    ]);
  });

  it("public deletion mills both decks and revives an eligible Digimon", async () => {
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

    await advance(s.engine).verb.deletePermanent([s.perm("skullsatamon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId),
    );

    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(milledInstanceIds(s, [s.inst("ownMillFirst").instanceId, s.inst("ownMillSecond").instanceId, s.inst("ownMillThird").instanceId])).toEqual([
      s.inst("ownMillFirst").instanceId,
      s.inst("ownMillSecond").instanceId,
      s.inst("ownMillThird").instanceId,
    ]);
    expect(milledInstanceIds(s, [s.inst("opponentMillFirst").instanceId, s.inst("opponentMillSecond").instanceId, s.inst("opponentMillThird").instanceId])).toEqual([
      s.inst("opponentMillFirst").instanceId,
      s.inst("opponentMillSecond").instanceId,
      s.inst("opponentMillThird").instanceId,
    ]);
  });

  it("may refuse the optional revival after a public deletion timing", async () => {
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
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("skullsatamon"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT24-073");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("revive").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(milledInstanceIds(s, [s.inst("ownMillFirst").instanceId, s.inst("ownMillSecond").instanceId, s.inst("ownMillThird").instanceId])).toEqual([
      s.inst("ownMillFirst").instanceId,
      s.inst("ownMillSecond").instanceId,
      s.inst("ownMillThird").instanceId,
    ]);
    expect(milledInstanceIds(s, [s.inst("opponentMillFirst").instanceId, s.inst("opponentMillSecond").instanceId, s.inst("opponentMillThird").instanceId])).toEqual([
      s.inst("opponentMillFirst").instanceId,
      s.inst("opponentMillSecond").instanceId,
      s.inst("opponentMillThird").instanceId,
    ]);
  });

  it("inherited attack mills both decks instead of security at 10 opposing trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-074", as: "host", under: ["BT24-073"] }],
        deck: ["BT1-013", "BT1-015", "BT1-045"],
        security: ["BT1-009", "BT1-011", "BT1-014"],
      },
      1: {
        deck: ["BT1-013", "BT1-015", "BT1-009"],
        security: ["BT1-010", "BT1-011", "BT1-012"],
        trash: Array.from({ length: 10 }, () => "BT1-013"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("inherited attack grants Security Attack +1 instead of milling above 10 opposing trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-074", as: "host", under: ["BT24-073"] }],
        deck: ["BT1-013", "BT1-015"],
      },
      1: {
        deck: ["BT1-045", "BT1-009"],
        security: ["BT1-014", "BT1-013", "BT1-015"],
        trash: Array.from({ length: 11 }, () => "BT1-011"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("resets inherited attack milling on the owner's later public attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-074", as: "host", under: ["BT24-073"] }],
        deck: ["BT1-013", "BT1-015", "BT1-045", "BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        deck: ["BT1-013", "BT1-015", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        battleArea: [
          { card: "BT1-009", as: "firstTarget", suspended: true, dp: 1000 },
          { card: "BT1-010", as: "secondTarget", suspended: true, dp: 1000 },
        ],
        security: ["BT1-014"],
        trash: Array.from({ length: 7 }, () => "BT1-013"),
      },
    });
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const firstTargetId = s.perm("firstTarget").permanentId;
    const firstOwnerDeck = s.state.players[0]!.deck.length;
    const firstOpponentDeck = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(firstOwnerDeck - 2);
    expect(s.state.players[1]!.deck).toHaveLength(firstOpponentDeck - 2);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstTargetId)).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const secondOwnerDeck = s.state.players[0]!.deck.length;
    const secondOpponentDeck = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(secondOwnerDeck - 2);
    expect(s.state.players[1]!.deck).toHaveLength(secondOpponentDeck - 2);
    expect(s.state.players[1]!.trash).toHaveLength(13);
    expect(s.state.players[1]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });
});
