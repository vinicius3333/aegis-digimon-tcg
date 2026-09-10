import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-001.js";
import "../index.js";

describe("EX4-001 Missimon", () => {
  it("registers the Digi-Egg identity and inherited effect from the catalog", () => {
    expect(getCardDefinition("EX4-001")).toMatchObject({
      cardId: "EX4-001",
      nameEn: "Missimon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      types: ["Machine", "BlueFlare"],
      inheritedEffectText: "[On Deletion] If you have a Digimon in play, . (Draw 1 card from your deck.)",
    });
  });

  it("draws 1 on deletion only while its owner still has a Digimon in play", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"] } },
    });
  });

  it("draws when its host is deleted while another own Digimon remains in play", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [
          { card: "BT1-030", as: "host", under: ["EX4-001"] },
          { card: "BT1-030", as: "otherDigimon" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("proves the public hatch and legal zero-cost evolution stack before deletion", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX4-001", as: "egg" }],
        hand: [{ card: "BT1-030", as: "gomamon" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        battleArea: [{ card: "BT1-030", as: "otherDigimon" }],
      },
      1: { deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"] },
    });
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX4-001");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeEvolution = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-030");
    expect(s.state.memory).toBe(memoryBeforeEvolution);
    expect(s.state.players[0]!.breeding!.topCard!.instanceId).toBe(s.inst("gomamon").instanceId);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const evolvedHost = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === eggPermanentId)!;
    expect(evolvedHost.topCard!.instanceId).toBe(s.inst("gomamon").instanceId);
    expect(evolvedHost.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    const handBeforeDeletion = s.state.players[0]!.hand.length;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    await advance(s.engine).verb.deletePermanent([eggPermanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === handBeforeDeletion + 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === eggInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("gomamon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects an incompatible red level-3 route from EX4-001", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX4-001", as: "egg" }, hand: [{ card: "BT1-010", as: "redDigimon" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("redDigimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("egg").topCard.cardId).toBe("EX4-001");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("redDigimon").instanceId]);
    expect(s.state.memory).toBe(5);
  });

  it("does not draw when deletion removes the host that carried the egg", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-030", as: "host", under: ["EX4-001"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not count an opponent's Digimon as the owner's Digimon in play", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-030", as: "host", under: ["EX4-001"] }] },
      1: { battleArea: [{ card: "BT1-030", as: "opponentDigimon" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
