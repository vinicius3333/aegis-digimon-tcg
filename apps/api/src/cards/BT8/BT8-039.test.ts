import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-039.js";

describe("BT8-039 Rapidmon", () => {
  it("suspends one opposing Digimon per Tamer, then gives up to 3 suspended Digimon -5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }, "BT1-085", "BT1-086"],
          hand: [{ card: "BT8-039", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "first" },
            { card: "BT2-047", as: "second" },
            { card: "BT2-047", as: "third", suspended: true },
            { card: "BT2-047", as: "fourth", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-039"));
    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 1000)).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 6000)).toHaveLength(1);
  });

  it("digivolves from exact-name Terriermon for 3 and can Armor Purge after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-046", as: "terriermon" }], hand: [{ card: "BT8-039", as: "rapidmon" }] },
        1: { battleArea: [{ card: "BT8-041", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const terriermonInstanceId = s.perm("terriermon").topCard.instanceId;
    const rapidmonInstanceId = s.inst("rapidmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("terriermon").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("terriermon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === terriermonInstanceId);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === rapidmonInstanceId)).toBe(true);
  });

  it("does not apply the exact-name special cost to Terriermon Assistant", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-046", as: "assistant" }], hand: [{ card: "BT8-039", as: "rapidmon" }] },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("assistant").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(2);
  });
});
