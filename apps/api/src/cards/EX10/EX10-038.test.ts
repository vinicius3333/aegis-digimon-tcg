import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-038.js";
import "../index.js";

const CARD_ID = "EX10-038";

const INERT = "BT1-009";
const APPMON_ONLY = "BT21-009";
const APPMON_LEVIATHAN = "BT23-009";
const APPMON_EGG_OFF_COLOUR = "BT21-005";
const PLAIN_EGG_OFF_COLOUR = "BT1-007";
const APPMON_HOST = "BT21-009";
const APPMON_IN_TRASH = "EX10-029";
const MULTI_LINK_HOST = "BT26-086";
const SPARE_LINK = "BT26-010";

describe("EX10-038 Copipemon", () => {
  it("records the exact catalog, Appmon evolution, and Link requirement", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["System"],
      types: ["Copy & Paste", "Leviathan"],
      linkDp: 2000,
    });
    expect(getCardDefinition(CARD_ID)!.linkRequirement?.replace(/\s/g, " ")).toBe("[Link] [Appmon] trait: Cost 1");
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });

  it("compiles both printed clauses with no residual", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] }, count: 1, to: "hand" },
            { filter: { nameOrTrait: [{ tokens: ["Leviathan"], match: "trait" }] }, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isLinked: true,
      actions: [{ kind: "Return", to: "hand", optional: true }],
    });
  });

  it("On Play from hand adds one Appmon and one Leviathan and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "copipemon" }, INERT],
          deck: [
            { card: APPMON_ONLY, as: "appmon" },
            { card: APPMON_LEVIATHAN, as: "leviathan" },
            { card: INERT, as: "rest" },
            { card: "BT1-013", as: "below" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("appmon").instanceId, s.inst("leviathan").instanceId);
    s.state.memory = 3;
    const copipemonId = s.inst("copipemon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: copipemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("leviathan").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[0]!;
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("leviathan").instanceId]),
    );
    expect(player.hand.map(({ instanceId }) => instanceId)).not.toContain(copipemonId);
    expect(player.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("below").instanceId,
      s.inst("rest").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === copipemonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds only the Appmon card when the reveal holds no Leviathan card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "copipemon" },
            { card: INERT, as: "spare" },
          ],
          deck: [
            { card: APPMON_ONLY, as: "appmon" },
            { card: INERT, as: "restA" },
            { card: "BT1-013", as: "restB" },
            { card: "BT1-014", as: "below" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("copipemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("appmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[0]!;
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("appmon").instanceId,
    ]);
    expect(player.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("below").instanceId,
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("a single dual-trait card fills one slot only: the two slots never share a card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "copipemon" }, INERT],
          deck: [
            { card: APPMON_LEVIATHAN, as: "dual" },
            { card: INERT, as: "restA" },
            { card: "BT1-013", as: "restB" },
            { card: "BT1-014", as: "below" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("copipemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dual").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[0]!;
    expect(player.hand).toHaveLength(handBefore);
    expect(player.hand.filter(({ instanceId }) => instanceId === s.inst("dual").instanceId)).toHaveLength(1);
    expect(player.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("below").instanceId,
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
  });

  it("digivolves in breeding from an off-colour Lv.2 [Appmon] egg for 0 memory", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: APPMON_EGG_OFF_COLOUR, as: "egg" },
        hand: [{ card: CARD_ID, as: "copipemon" }],
        deck: [{ card: "BT1-013", as: "drawn" }, "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const copipemonId = s.inst("copipemon").instanceId;
    const permanentId = s.perm("egg").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: copipemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === copipemonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(permanentId);
    expect(s.state.players[0]!.breeding?.stack.map(({ instanceId }) => instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("refuses the 0-cost route from a Lv.2 egg without the [Appmon] trait", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: PLAIN_EGG_OFF_COLOUR, as: "egg" },
        hand: [{ card: CARD_ID, as: "copipemon" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const copipemonId = s.inst("copipemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: copipemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(eggId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([copipemonId]);
  });

  it("links only to an [Appmon] Digimon for 1 memory and contributes +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: APPMON_HOST, as: "appmon" },
          { card: INERT, as: "plain" },
        ],
        hand: [{ card: CARD_ID, as: "copipemon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();
    const baseDp = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("copipemon").instanceId,
        targetPermanentId: s.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("copipemon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(baseDp + 2000);
  });

  it("Q5117/Q5118 returns an Appmon by trashing itself or another link card of the same host", async () => {
    for (const costAlias of ["copipemon", "sameHost"] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: MULTI_LINK_HOST,
                as: "host",
                dp: 20_000,
                linked: [
                  { card: CARD_ID, as: "copipemon" },
                  { card: SPARE_LINK, as: "sameHost" },
                ],
              },
              { card: APPMON_HOST, as: "neighbor", linked: [{ card: SPARE_LINK, as: "neighborLink" }] },
            ],
            trash: [{ card: APPMON_IN_TRASH, as: "appmon" }],
          },
          1: { security: [INERT, INERT] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst(costAlias).instanceId, s.inst("appmon").instanceId);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("appmon").instanceId));

      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst(costAlias).instanceId);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("appmon").instanceId);
      expect(s.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toEqual([
        s.inst("neighborLink").instanceId,
      ]);
      expect(s.perm("host").linked).toHaveLength(1);
    }
  });

  it('declining the "you may" leaves the link cards and the trash untouched', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: MULTI_LINK_HOST,
              as: "host",
              dp: 20_000,
              linked: [
                { card: CARD_ID, as: "copipemon" },
                { card: SPARE_LINK, as: "sameHost" },
              ],
            },
          ],
          trash: [{ card: APPMON_IN_TRASH, as: "appmon" }],
        },
        1: { security: [INERT, INERT] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("copipemon").instanceId,
      s.inst("sameHost").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("appmon").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });

  it("returns the cost card itself when the trash holds no other [Appmon] Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: MULTI_LINK_HOST,
              as: "host",
              dp: 20_000,
              linked: [
                { card: CARD_ID, as: "copipemon" },
                { card: SPARE_LINK, as: "sameHost" },
              ],
            },
          ],
          trash: [{ card: INERT, as: "plain" }],
        },
        1: { security: [INERT, INERT] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);

    const player = s.state.players[0]!;
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("sameHost").instanceId]);
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("copipemon").instanceId]);
    expect(player.hand).toHaveLength(handBefore + 1);
    expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("plain").instanceId]);
  });
});
