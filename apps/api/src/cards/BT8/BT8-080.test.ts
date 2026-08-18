import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT8-080.js";

describe("BT8-080 Myotismon", () => {
  it("mills 2, then plays Yukio Oikawa from trash for free", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-074", as: "base" }], hand: [{ card: "BT8-080", as: "evolving" }], deck: ["BT1-009", { card: "BT8-093", as: "yukio" }, "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-080"));
    expect(s.state.players[0]!.battleArea.some(permanent => permanent.topCard?.instanceId === s.inst("yukio").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("plays Yukio Oikawa when a Myotismon-named host with this inherited effect is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-083", as: "host", under: ["BT8-080"] }], hand: [{ card: "BT8-093", as: "yukio" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("yukio").instanceId)).toBe(true);
  });

  it("does not play Yukio Oikawa when the deleted host is not Myotismon-named", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT8-080"] }], hand: [{ card: "BT8-093", as: "yukio" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yukio").instanceId)).toBe(true);
  });
});
