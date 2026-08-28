import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-026.js";
import "../index.js";

const CARD_ID = "EX10-026";

describe("EX10-026 SkullKnightmon", () => {
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
      types: ["Undead", "Bagra Army", "Twilight"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, texts: ["Knightmon"], cost: 2, isAlternate: true }],
    });

    const normal = setupEngine({
      0: { battleArea: [{ card: "BT2-055", as: "base" }], hand: [{ card: CARD_ID, as: "skull" }] },
    });
    normal.state.memory = 3;
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("base").permanentId,
        instanceId: normal.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("base").topCard.cardId === CARD_ID);
    expect(normal.state.memory).toBe(0);

    const alternate = setupEngine({
      0: { battleArea: [{ card: "BT18-058", as: "base" }], hand: [{ card: CARD_ID, as: "skull" }] },
    });
    alternate.state.memory = 2;
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("base").permanentId,
        instanceId: alternate.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("base").topCard.cardId === CARD_ID);
    expect(alternate.state.memory).toBe(0);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s pays exactly 1 hand card and deletes only cost 4 or lower",
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
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "low" },
              { card: "BT15-027", as: "high" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("cost").instanceId, s.perm("high").permanentId, s.perm("low").permanentId);
      await advance(s.engine).fireForPermanent(timing, s.perm("source"));
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("spare").instanceId);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
        s.inst("low").instanceId,
      );
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
        s.inst("high").instanceId,
      );
    },
  );

  it("may refuse and cannot resolve without a hand card", async () => {
    for (const withCost of [true, false]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: CARD_ID, as: "source" }], hand: withCost ? [{ card: "BT1-001", as: "cost" }] : [] },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        withCost ? { autoDeclineOptional: true } : { autoAcceptOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
        s.inst("target").instanceId,
      );
      if (withCost) expect(s.state.players[0]!.hand).toHaveLength(1);
    }
  });

  it("Saves itself under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "skull" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const skullId = s.inst("skull").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === skullId));
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(skullId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(skullId);
  });

  it("grants inherited Blocker only to its evolution host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-063", as: "host", under: [{ card: CARD_ID, as: "skull" }, "BT18-058"] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Blocker")).toBe(false);
  });
});
