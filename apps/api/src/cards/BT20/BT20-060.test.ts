import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-060.js";
import "./index.js";

describe("BT20-060 Alphamon: Ouryuken", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
  });

  it("reduces one opposing Digimon by 15000 and, only on DNA digivolving, trashes the top security card and recovers one", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -15000, duration: "untilOpponentTurnEnd" });
      expect(actions[1]).toMatchObject({
        kind: "Trash",
        condition: { kind: "isDnaDigivolving" },
        target: { filter: { controller: "opponent", zone: "security" }, count: 1, fromTop: true },
      });
      expect(actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "isDnaDigivolving" },
      });
    }
  });

  it("gains 3 memory once per turn when security is removed", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [{ kind: "GainMemory", amount: 3 }],
        },
      ],
    });
  });

  it("publishes the ACE/Overflow and printed stat metadata", () => {
    expect(getCardDefinition("BT20-060")).toMatchObject({
      isAce: true,
      overflowMemory: 5,
      playCost: 9,
      dp: 16000,
      level: 7,
    });
  });

  it("on normal play and evolution applies -15000 without trashing or recovering security", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play" ? {} : { battleArea: [{ card: "BT20-056", as: "base" }] }),
            hand: [{ card: "BT20-060", as: "ouryuken" }],
            deck: [
              { card: "BT20-047", as: "drawCard" },
              { card: "BT20-047", as: "deckTop" },
            ],
            security: ["BT20-047"],
          },
          1: {
            battleArea: [{ card: "BT20-057", dp: 20000, as: "target" }],
            security: ["BT20-047", "BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 9 : 6;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ouryuken").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("ouryuken").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.perm("target").currentDP === 5000);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[0]!.deck).toHaveLength(mode === "play" ? 2 : 1);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.state.memory).toBe(0);
    }
  });

  it("Q4398 Blast DNA finishes security trash and Recovery before deleting a 0-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-056", as: "alphamon" },
            { card: "BT20-018", as: "ouryumon" },
          ],
          hand: [{ card: "BT20-060", as: "ouryuken" }],
          deck: [
            { card: "BT20-047", as: "drawn" },
            { card: "BT20-047", as: "recovered" },
          ],
        },
        1: {
          battleArea: [{ card: "BT20-057", dp: 15000, as: "target" }],
          security: [{ card: "BT20-047", as: "trashed" }, "BT20-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("alphamon").permanentId, s.perm("ouryumon").permanentId],
        instanceId: s.inst("ouryuken").instanceId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.memory === 3);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashed").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("rejects Blast DNA when the Ouryumon material is missing", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-056", as: "alphamon" },
          { card: "BT20-057", as: "wrong" },
        ],
        hand: [{ card: "BT20-060", as: "ouryuken" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("alphamon").permanentId, s.perm("wrong").permanentId],
        instanceId: s.inst("ouryuken").instanceId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gains 3 memory only once across removals from both security stacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-060", as: "ouryuken" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(3);
  });

  it("charges Overflow -5 when the ACE leaves the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-060", as: "ouryuken" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("ouryuken").permanentId], "byEffect");
    expect(s.state.memory).toBe(-5);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-060");
  });
});
