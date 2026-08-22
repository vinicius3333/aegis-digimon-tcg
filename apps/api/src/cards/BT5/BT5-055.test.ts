import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-055.js";

describe("BT5-055 BanchoLillymon", () => {
  it("returns a suspended opposing Digimon to deck bottom and trashes its sources when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-055", as: "bancho" }] }, 1: { battleArea: [{ card: "BT4-073", as: "target", suspended: true, under: [{ card: "BT1-009", as: "source" }] }, { card: "BT2-047", as: "upright" }] } }, { autoSelectCards: true });
    const targetId = s.perm("target").topCard!.instanceId;
    const sourceId = s.inst("source").instanceId;
    await (s.engine as any).primitives.deletePermanent([s.perm("bancho").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.perm("upright")).toBeDefined();
  });
});
