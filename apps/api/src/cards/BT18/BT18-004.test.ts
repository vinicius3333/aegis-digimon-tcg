import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-004.js";

describe("BT18-004 Puroromon", () => {
  it("places a Royal Base Digimon face up at security bottom and adds the top security card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourMainPhase", isInherited: true, actions: [{ kind: "SecurityManipulation", op: "toHand", toTop: true, cost: { kind: "place", target: { filter: { zone: "hand", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] } } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-004"] }], hand: [{ card: "BT18-044", as: "royal" }], security: [{ card: "BT1-001", as: "top" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT18-044");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
  });
});
