import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-075.js";

describe("BT8-075 Kogamon", () => {
  it("grants Retaliation as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-079", as: "host", under: ["BT8-075"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("deletes the opposing Digimon after its host loses a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-079", as: "host", under: ["BT8-075"], dp: 5000 }] },
      1: { battleArea: [{ card: "BT2-047", as: "defender", dp: 15000, suspended: true }] },
    });
    const hostId = s.perm("host").permanentId;
    const defenderId = s.perm("defender").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-075")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-047")).toBe(true);
  });

  it("digivolves from a purple level-3 Digimon for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-073", as: "base" }], hand: [{ card: "BT8-075", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-075");

    expect(s.perm("base").topCard.cardId).toBe("BT8-075");
    expect(s.state.memory).toBe(1);
  });
});
