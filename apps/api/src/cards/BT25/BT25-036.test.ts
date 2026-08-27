import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_036 } from "./BT25-036.js";
import "../index.js";

describe("BT25-036 Craftmon", () => {
  it("matches the catalog and defers its Security play until the battle ends", () => {
    expect(getCardDefinition("BT25-036")).toMatchObject({
      cardId: "BT25-036",
      nameEn: "Craftmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Tool"],
      types: ["Design"],
      linkDp: 3000,
      linkRequirement: expect.stringContaining("[Appmon]"),
    });
    expect(BT25_036.coverage).toBe("full");
    expect(BT25_036.residual).toEqual([]);

    expect(BT25_036.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("adds the top security card, then performs Recovery +1", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_036.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(2);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
      });
    }
  });

  it("uses the four-name App Fusion pool as a two-distinct-name requirement", () => {
    expect(BT25_036.appFusionRequirement).toEqual([{ names: ["Kabemon", "Gomimon", "Ecomon", "Puzzlemon"], cost: 0 }]);
    expect(BT25_036.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityBattleEnded",
      once: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          from: ["trash"],
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("plays from security only after its battle, then runs On Play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          security: [
            { card: "BT25-036", as: "securityCraftmon" },
            { card: "BT1-009", as: "oldTop" },
          ],
          deck: [{ card: "BT1-010", as: "recovered" }],
        },
      },
      { autoSelectCards: true },
    );
    const craftmonId = s.inst("securityCraftmon").instanceId;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === craftmonId));

    // Craftmon was battled as the revealed security Digimon first: the weaker attacker is deleted.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("attacker").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(craftmonId);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("oldTop").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]?.instanceId).toBe(s.inst("recovered").instanceId);
  });

  it("performs Recovery +1 when activated with zero security cards", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-036", as: "craftmon" }], deck: [{ card: "BT1-010", as: "recovered" }] },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("craftmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
    expect(
      s.state.players[0]!.security.find(({ instanceId }) => instanceId === s.inst("recovered").instanceId)?.faceUp,
    ).toBe(false);
  });

  it("runs the same security exchange when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-045", as: "base" }],
        hand: [{ card: "BT25-036", as: "craftmon" }],
        security: [{ card: "BT1-009", as: "oldTop" }],
        deck: [
          { card: "BT1-010", as: "drawBonus" },
          { card: "BT1-012", as: "recovered" },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("craftmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "BT25-036" &&
        s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("recovered").instanceId),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("oldTop").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawBonus").instanceId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
    expect(
      s.state.players[0]!.security.find(({ instanceId }) => instanceId === s.inst("recovered").instanceId)?.faceUp,
    ).toBe(false);
  });

  it("app fuses from each distinct named pair and rejects a duplicate-name pair", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX10-024", as: "kabemon", linked: [{ card: "BT26-051", as: "gomimon" }] }],
        hand: [{ card: "BT25-036", as: "craftmon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    legal.state.memory = 0;
    const fused = await advance(legal.engine).verb.appFuseInto(
      legal.perm("kabemon").permanentId,
      legal.inst("craftmon").instanceId,
    );
    expect(fused?.topCard.cardId).toBe("BT25-036");
    expect(fused?.stack.map(({ cardId }) => cardId)).toContain("EX10-024");

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "EX10-024", as: "kabemon", linked: [{ card: "EX10-024", as: "sameName" }] }],
        hand: [{ card: "BT25-036", as: "craftmon" }],
      },
    });
    const denied = await advance(illegal.engine).verb.appFuseInto(
      illegal.perm("kabemon").permanentId,
      illegal.inst("craftmon").instanceId,
    );
    expect(denied).toBeUndefined();
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      illegal.inst("craftmon").instanceId,
    );
  });
});
