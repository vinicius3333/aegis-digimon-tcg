import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-022.js";

describe("BT12-022 ExVeemon", () => {
  it("gains 1 memory when it DNA digivolves into a green Digimon on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-022", as: "exveemon" },
          // A neutral green Lv.4 keeps this proof scoped to ExVeemon's
          // replacement effect instead of also resolving Stingmon's +1 memory.
          { card: "BT1-069", as: "stingmon" },
        ],
        hand: [{ card: "BT12-028", as: "paildramon" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("exveemon").permanentId, s.perm("stingmon").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT12-028");
    expect(s.state.memory).toBe(1);
  });

  it.each([
    ["Imperialdramon name", "BT12-030"],
    ["Free trait", "BT12-028"],
  ])("grants inherited Jamming to a host with the %s branch", async (_case, host) => {
    const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT12-022"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("does not grant inherited Jamming to an unrelated host or during the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-022"] }] } });
    await plain.ready();
    expect(observe(plain.engine).hasKeyword(plain.perm("host"), "Jamming")).toBe(false);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-030", as: "host", under: ["BT12-022"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.engine.recomputeContinuousEffects();
    expect(observe(offTurn.engine).hasKeyword(offTurn.perm("host"), "Jamming")).toBe(false);
  });
});
