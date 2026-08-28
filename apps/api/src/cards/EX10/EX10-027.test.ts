import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-027.js";
import "../index.js";

const CARD_ID = "EX10-027";

describe("EX10-027 DeadlyAxemon", () => {
  it("records the exact catalog and normal plus Knightmon-text evolution routes", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Purple"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Animal", "Bagra Army", "Twilight"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, texts: ["Knightmon"], cost: 2, isAlternate: true }],
    });
    for (const useAlternateCost of [false, true]) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT18-058", as: "base" }], hand: [{ card: CARD_ID, as: "deadly" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("deadly").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(useAlternateCost ? 1 : 0);
    }
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s pays 1 hand card and returns exactly 1 qualifying Digimon",
    async (timing) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: CARD_ID, as: "source" }],
            hand: [
              { card: "BT1-001", as: "cost" },
              { card: "BT1-002", as: "spare" },
            ],
            trash: [
              { card: "BT18-058", as: "knightText" },
              { card: "EX10-028", as: "near" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("cost").instanceId, s.inst("near").instanceId, s.inst("knightText").instanceId);
      await advance(s.engine).fireForPermanent(timing, s.perm("source"));
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([s.inst("spare").instanceId, s.inst("knightText").instanceId]),
      );
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("near").instanceId);
    },
  );

  it("Q5082 may pay the cost and return no card, while refusing pays nothing", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT18-058", as: "target" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const running = advance(paid.engine).fireForPermanent(EffectTiming.OnPlay, paid.perm("source"));
    await settle(() => paid.state.pendingDecision?.kind === "selectCards");
    const costDecision = paid.state.pendingDecision!;
    expect(
      paid.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [paid.inst("cost").instanceId] },
      }),
    ).toEqual({ ok: true });
    await running;
    expect(paid.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([paid.inst("cost").instanceId, paid.inst("target").instanceId]),
    );

    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT18-058", as: "target" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(refused.engine).fireForPermanent(EffectTiming.OnPlay, refused.perm("source"));
    expect(refused.state.players[0]!.hand).toHaveLength(1);
    expect(refused.state.players[0]!.trash).toHaveLength(1);
  });

  it("Saves itself and grants inherited Retaliation only to its host", async () => {
    const saved = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deadlyId = saved.inst("deadly").instanceId;
    await advance(saved.engine).verb.deletePermanent([saved.perm("deadly").permanentId]);
    await settle(() => saved.perm("tamer").stack.some(({ instanceId }) => instanceId === deadlyId));
    expect(saved.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(deadlyId);

    const inherited = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-063", as: "host", under: [{ card: CARD_ID, as: "deadly" }, "BT18-058"] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Retaliation")).toBe(true);
    expect(observe(inherited.engine).hasKeyword(inherited.perm("standalone"), "Retaliation")).toBe(false);
  });
});
