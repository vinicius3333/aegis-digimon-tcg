import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-040.js";

describe("EX1-040 MegaKabuterimon", () => {
  it("can digivolve into an Insectoid or Ancient Insect while attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-040", as: "mega" }], hand: [{ card: "BT1-081", as: "evo" }] }, 1: { security: ["BT1-001", "BT1-001"] } }, { autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("mega").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT1-081");
    expect(s.perm("mega").topCard.instanceId).toBe(s.inst("evo").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("gains 1 memory when its host deletes an opponent in battle and survives", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-081", as: "host", under: ["EX1-040"] }] } });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(6);
  });
});
