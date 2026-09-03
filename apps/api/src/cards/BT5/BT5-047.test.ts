import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-047.js";
import "../BT11/BT11-043.js";

describe("BT5-047 Palmon", () => {
  it("places itself from trash under an own green Digimon when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-047", as: "palmon" },
            { card: "BT5-046", as: "green" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const palmonId = s.perm("palmon").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("palmon").permanentId], "byEffect");
    await settle(() => s.perm("green").stack.some((card) => card.instanceId === palmonId));
    expect(s.perm("green").stack[0]?.instanceId).toBe(palmonId);
  });

  it("does not place itself when no own green Digimon is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-047", as: "palmon" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const palmonId = s.perm("palmon").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("palmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === palmonId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === palmonId)).toBe(true);
  });

  it("recovers itself after BT11-043 changes its name, and places it at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-047", as: "palmon" },
            { card: "BT5-046", as: "green", under: ["BT5-048"] },
          ],
          trash: Array.from({ length: 16 }, () => "BT1-001"),
        },
        1: { hand: [{ card: "BT11-043", as: "king" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const palmonId = s.perm("palmon").topCard!.instanceId;
    const existingId = s.perm("green").stack[0]!.instanceId;

    expect(observe(s.engine).effectiveNames(s.perm("palmon"))).toEqual(["palmon"]);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).effectiveNames(s.perm("palmon")).includes("sukamon"));

    expect(observe(s.engine).effectiveNames(s.perm("palmon"))).toEqual(["sukamon"]);
    await advance(s.engine).verb.deletePermanent([s.perm("palmon").permanentId], "byEffect");
    await settle(() => s.perm("green").stack.some((card) => card.instanceId === palmonId));

    expect(s.perm("green").stack.map((card) => card.instanceId)).toEqual([palmonId, existingId]);
    expect(s.perm("green").stack[1]!.cardId).toBe("BT5-048");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === palmonId)).toBe(false);
  });

  it("places a different Palmon from the trash instead of the deleted source", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-047", as: "source" },
            { card: "BT5-046", as: "green" },
          ],
          trash: [{ card: "BT5-047", as: "other" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("other").instanceId);
    const sourceId = s.perm("source").topCard!.instanceId;
    const otherId = s.inst("other").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.perm("green").stack.some((card) => card.instanceId === otherId));

    expect(s.perm("green").stack[0]!.instanceId).toBe(otherId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
  });
});
