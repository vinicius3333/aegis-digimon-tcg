import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-050.js";

describe("BT12-050 Stingmon", () => {
  it.each([
    ["Imperialdramon name", "BT12-030"],
    ["Free trait", "BT12-028"],
  ])("grants inherited Piercing to a host with the %s branch", async (_case, host) => {
    const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT12-050"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("does not grant inherited Piercing to an unrelated host or during the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-050"] }] } });
    await plain.ready();
    expect(observe(plain.engine).hasPierce(plain.perm("host"))).toBe(false);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-030", as: "host", under: ["BT12-050"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.engine.recomputeContinuousEffects();
    expect(observe(offTurn.engine).hasPierce(offTurn.perm("host"))).toBe(false);
  });

  it("gains 1 memory when it DNA digivolves into a blue Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-037", as: "exveemon" },
          { card: "BT12-050", as: "stingmon" },
        ],
        hand: [{ card: "BT12-028", as: "paildramon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("exveemon").permanentId, s.perm("stingmon").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT12-028");

    expect(s.state.memory).toBe(1);
  });
});
