import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-078.js";
import "../BT10/BT10-073.js";

describe("BT5-078 Jokermon", () => {
  it("plays a purple level 3 from trash without activating its On Play effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-078", as: "joker" }], trash: [{ card: "BT10-073", as: "rookie" }], deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const rookieId = s.inst("rookie").instanceId;
    await (s.engine as any).primitives.deletePermanent([s.perm("joker").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("does not play a purple Digimon at another level", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-078", as: "joker" }], trash: [{ card: "BT5-075", as: "wrongLevel" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    await (s.engine as any).primitives.deletePermanent([s.perm("joker").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongLevel").instanceId)).toBe(true);
  });
});
