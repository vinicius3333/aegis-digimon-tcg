import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT13/BT13-102.js";
import "../BT17/BT17-087.js";
import { compiled } from "./EX8-030.js";

describe("EX8-030", () => {
  it("allows memory from a Tamer treated as a Digimon during its actual attack (Q3914)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-087", as: "marcus" },
            { card: "BT1-010", as: "agumon" },
          ],
          hand: [{ card: "BT17-087", as: "playedMarcus" }],
        },
        1: { battleArea: [{ card: "EX8-030", as: "tapirmon" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 3000);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("evolves from an off-color NSo egg for zero and draws the evolution card", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-006", as: "egg" },
        hand: [{ card: "EX8-030", as: "tapirmon" }],
        deck: ["BT1-028", "BT1-037"],
      },
    });
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("tapirmon").instanceId,
      useAlternateCost: true,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028"));
    expect(s.perm("egg").topCard.cardId).toBe("EX8-030");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX8-006"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-028"]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects an off-color non-NSo egg", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX8-002", as: "egg" }, hand: [{ card: "EX8-030", as: "tapirmon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tapirmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("egg").topCard.cardId).toBe("EX8-002");
  });

  it.each([
    { opposing: true, memory: 0 },
    { opposing: false, memory: 1 },
  ])("blocks only opposing Digimon memory during a real attack: opposing=$opposing", async ({ opposing, memory }) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-021", as: "attacker" }, ...(!opposing ? [{ card: "EX8-030" }] : [])] },
      1: { battleArea: opposing ? [{ card: "EX8-030" }] : [], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memory);
  });

  it("allows an opposing Tamer's actual On Play memory gain", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-102", as: "keenan" }], deck: ["BT1-028", "BT1-037"] },
        1: { battleArea: [{ card: "EX8-030", as: "tapirmon" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("keenan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-102")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-028"]);
    expect(s.state.memory).toBe(1);
  });

  it("prevents the opponent from gaining memory except through Tamer effects", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "RestrictMemoryGain",
      seat: "opponent",
      exceptTamerEffects: true,
      duration: "permanent",
    }));

  it("enforces the live memory-gain restriction by source kind and seat", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-030", as: "tapirmon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon", "Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});
