import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./EX10-024.js";
import "../index.js";

const CARD_ID = "EX10-024";

/**
 * EX10-024 Kabemon (Black, Lv.3, [Appmon]/[Wallpaper]).
 *
 * Printed: "[Digivolve] Lv.2 w/[Appmon] trait: Cost 0", "[Security] At the end of the battle,
 * play this card without paying the cost.", "[Link] [Appmon] trait: Cost 1" and the link effect
 * "[When Attacking] By trashing 1 of this Digimon's link cards, ＜De-Digivolve 1＞ 1 of your
 * opponent's Digimon."
 *
 * Every clause is proved through public intents: `digivolve`, `linkCard`, `attack` and the
 * production block window. The link effect fires from a real attack declaration, never from
 * injected timing.
 */
describe("EX10-024 Kabemon", () => {
  it("records the linked De-Digivolve, the Security play and both requirements", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isLinked: true,
          actions: [
            expect.objectContaining({
              kind: "DeDigivolve",
              amount: 1,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              cost: expect.objectContaining({
                kind: "trash",
                target: { filter: { controller: "mine", zone: "linked", isSelfRef: true }, count: 1 },
              }),
              optional: true,
              abortOnDecline: true,
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              payCost: false,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });

  it("matches the catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kabemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["System"],
      types: ["Wallpaper"],
      linkDp: 2000,
      effectText:
        "[Digivolve] Lv.2 w/[Appmon]\u00a0trait: Cost 0 \n\n[Security] At the end of the battle, play this card without paying the cost.",
      linkEffect:
        "[When Attacking] By trashing 1 of this Digimon's link cards, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
      // The catalog separates "[Appmon]" and "trait" with U+00A0 in both printed lines.
      // Reported, not edited.
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 1",
    });
  });

  it("digivolves for 0 from the printed Black Lv.2 route and from the [Appmon] Lv.2 route", async () => {
    // BT2-005 Kapurimon is the printed route (Black, Lv.2, no [Appmon] trait);
    // EX10-001 Flickmon is the alternate one (Lv.2 [Appmon], Green — the trait, not the color).
    for (const baseCard of ["BT2-005", "EX10-001"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: CARD_ID, as: "kabe" }] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("kabe").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand).toHaveLength(0);
    }
  });

  it("refuses an illegal source: a Lv.3 non-[Appmon] Digimon is not a legal base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: CARD_ID, as: "kabe" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kabe").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
  });

  it("links only to an [Appmon] Digimon, for exactly 1 memory, and adds +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [{ card: CARD_ID, as: "kabe" }],
      },
    });
    s.state.memory = 1;
    await s.ready();
    const baseDp = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("kabe").instanceId,
        targetPermanentId: s.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("kabe").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(baseDp + 2000);
  });

  it("[Security] battles first, then plays Kabemon without paying the cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [CARD_ID] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5076: the link effect may trash Kabemon itself to ＜De-Digivolve 1＞ one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "kabe" }] }],
        },
        1: {
          battleArea: [{ card: "BT10-081", as: "target", under: [{ card: "BT10-074", as: "source" }] }],
          security: ["BT1-009"],
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
    await settle(() => s.perm("target").topCard.instanceId === s.inst("source").instanceId);

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("kabe").instanceId);
    expect(s.perm("target").topCard.cardId).toBe("BT10-074");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT10-081");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("Q5077: it may trash a different link card on the same host instead", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              // The host prints ＜Link +6＞, so a second link card is legal board state without
              // poking the continuous ledger; the rule sweep trashes an over-cap link otherwise.
              card: "BT26-086",
              as: "host",
              dp: 20_000,
              linked: [
                { card: CARD_ID, as: "kabe" },
                { card: "BT21-047", as: "other" },
              ],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT10-081", as: "target", under: [{ card: "BT10-074", as: "source" }] }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("other").instanceId);
    await s.ready();
    expect(s.perm("host").linked).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("source").instanceId);

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("kabe").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("other").instanceId);
    expect(s.perm("target").topCard.cardId).toBe("BT10-074");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT10-081");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the optional cost leaves both the link card and the opposing stack untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "kabe" }] }],
        },
        1: {
          battleArea: [{ card: "BT10-081", as: "target", under: [{ card: "BT10-074", as: "source" }] }],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => false, 30);

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("kabe").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT10-081");
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT10-074"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
