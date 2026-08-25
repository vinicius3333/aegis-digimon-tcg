import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-038.js";
import "../index.js";

const CARD_ID = "EX10-038";

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
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });

  it("proves the Appmon alternate digivolution and two-category reveal", () => {
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
  });

  it("adds distinct Appmon and Leviathan cards from the top 3 and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "copipemon" }],
          deck: [
            { card: "BT21-009", as: "appmon" },
            { card: "EX10-062", as: "leviathan" },
            { card: "BT1-009", as: "rest" },
            { card: "BT1-010", as: "below" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("appmon").instanceId, s.inst("leviathan").instanceId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("copipemon"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("leviathan").instanceId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("rest").instanceId);
  });

  it("links only to Appmon for 1 and contributes +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "plain" },
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

  it("Q5117/Q5118 returns an Appmon by trashing itself or another same-host link", async () => {
    for (const costAlias of ["copipemon", "sameHost"] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT21-009",
                as: "host",
                linked: [
                  { card: CARD_ID, as: "copipemon" },
                  { card: "BT26-010", as: "sameHost" },
                ],
              },
              { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
            ],
            trash: [{ card: "EX10-029", as: "appmon" }],
          },
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
      expect(s.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toContain(
        s.inst("neighborLink").instanceId,
      );
    }
  });
});
