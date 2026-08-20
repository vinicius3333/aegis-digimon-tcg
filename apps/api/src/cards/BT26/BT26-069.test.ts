import { describe, expect, it, vi } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-069";
const filler = (count: number) => Array.from({ length: count }, () => "AD1-001");

describe("BT26-069 Dobermon", () => {
  it("draws when this exact card is trashed from hand and 5 cards remain (Q7091 boundary)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "dobermon" }, ...filler(5)],
        deck: [{ card: "AD1-002", as: "drawn" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("dobermon").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(CARD_ID);
  });

  it("does not draw when 6 cards remain after this card is trashed (Q7091 activation-time gate)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "dobermon" }, ...filler(6)],
        deck: [{ card: "AD1-002", as: "top" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("dobermon").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once when 2 copies are trashed to a 5-card hand because the first draw closes Q7091's gate", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "first" }, { card: CARD_ID, as: "second" }, ...filler(5)],
        deck: ["AD1-002", "AD1-003"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("first").instanceId, s.inst("second").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === CARD_ID)).toHaveLength(2);
  });

  it("uses the Lv.3 [TS] alternate evolution path, pays 2, trashes a hand card, and deletes only a level-4 target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-008", as: "tsBase" }],
          hand: [
            { card: CARD_ID, as: "dobermon" },
            { card: "AD1-002", as: "cost" },
          ],
          deck: ["AD1-001"],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "lv4" },
            { card: "AD1-002", as: "lv5" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const ownTargetId = s.perm("tsBase").permanentId;
    const lv4TargetId = s.perm("lv4").permanentId;
    const lv5TargetId = s.perm("lv5").permanentId;
    preferred.push(s.inst("cost").instanceId, lv4TargetId);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("dobermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tsBase").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("tsBase").stack.map((card) => card.cardId)).toEqual(["BT26-008"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["AD1-002"]);
    const targetDecision = s.decisions.find((decision) => decision.req.kind === "chooseTargets");
    expect(targetDecision?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([ownTargetId, lv4TargetId]),
    );
    expect(targetDecision?.req.options?.candidateInstanceIds).not.toContain(lv5TargetId);
  });

  it("may decline the By-cost, leaving hand and both players' eligible Digimon untouched", async () => {
    const source = {
      instanceId: "dobermon",
      cardId: CARD_ID,
      ownerSeat: 0,
      permanent: () => ({ permanentId: "self" }),
      isOnBattleArea: () => true,
    } as any;
    const trash = vi.fn(async () => []);
    const deletePermanent = vi.fn(async () => 0);
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;

    await effect.resolve({
      source,
      game: {
        player: (seat: number) =>
          seat === 0
            ? {
                hand: [{ instanceId: "cost" }],
                battleArea: [{ permanentId: "own-lv4", topCard: { cardId: "AD1-001" } }],
              }
            : { hand: [], battleArea: [{ permanentId: "opp-lv4", topCard: { cardId: "AD1-001" } }] },
        state: { players: [] },
      },
      ask: { selectCards: vi.fn(async () => []) },
      fx: { trash, deletePermanent },
    } as any);

    expect(trash).not.toHaveBeenCalled();
    expect(deletePermanent).not.toHaveBeenCalled();
  });

  it("inherited effect evolves a Titan host into a legal Titamon from trash for cost reduced by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: [{ card: CARD_ID, as: "inherited" }] }],
          hand: [{ card: "AD1-001", as: "discard" }],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discard").instanceId]);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID, "BT26-074"]);
  });

  it("inherited watcher rejects a non-Titan host even when a legal Titamon is in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-11", as: "host", under: [{ card: CARD_ID, as: "inherited" }] }],
          hand: [{ card: "AD1-001", as: "discard" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discard").instanceId]);

    expect(s.perm("host").topCard.cardId).toBe("ST16-11");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("P-209");
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
  });
});
