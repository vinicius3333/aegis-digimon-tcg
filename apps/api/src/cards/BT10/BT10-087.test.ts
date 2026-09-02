import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-087.js";

describe("BT10-087 Taiki Kudo", () => {
  it("adds one Xros Heart card and places a different Xros Heart Digimon under itself on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-087", as: "taiki" }],
          deck: [{ card: "BT10-007", as: "xrosA" }, { card: "BT10-008", as: "xrosB" }, "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taiki").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (p) => p.topCard.instanceId === s.inst("taiki").instanceId && p.stack.length === 1,
      ),
    );

    const taiki = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("taiki").instanceId)!;
    const selectedIds = new Set([s.inst("xrosA").instanceId, s.inst("xrosB").instanceId]);
    expect(taiki.stack).toHaveLength(1);
    expect(selectedIds.has(taiki.stack[0]!.instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => selectedIds.has(card.instanceId))).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("suspends itself to use DigiXros materials placed under a different Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-087", as: "taiki" },
          {
            card: "BT10-089",
            as: "otherTamer",
            under: [
              { card: "BT10-019", as: "greymon" },
              { card: "BT10-021", as: "mailbirdramon" },
            ],
          },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("taiki").permanentId],
          underTamerHostPermanentId: s.perm("otherTamer").permanentId,
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT10-024" && permanent.stack.length === 2,
      ),
    );

    const metalGreymon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-024")!;
    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(metalGreymon.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId]),
    );
    expect(s.perm("otherTamer").stack).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("does not mix materials under two different Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-087", as: "taiki" },
          { card: "BT10-089", as: "firstTamer", under: [{ card: "BT10-019", as: "greymon" }] },
          { card: "BT10-090", as: "secondTamer", under: [{ card: "BT10-021", as: "mailbirdramon" }] },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("taiki").permanentId],
          underTamerHostPermanentId: s.perm("firstTamer").permanentId,
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.perm("firstTamer").stack).toHaveLength(1);
    expect(s.perm("secondTamer").stack).toHaveLength(1);
  });

  it("cannot reuse a suspended Taiki as a DigiXros material expander", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-087", as: "taiki", suspended: true },
          { card: "BT10-089", under: [{ card: "BT10-019", as: "greymon" }] },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId],
          expanderPermanentIds: [s.perm("taiki").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
  });

  it("plays itself from security without paying its memory cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT10-087", as: "securityTaiki", faceUp: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTaiki"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-087")).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
