import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-025.js";

describe("LM-025 Cyberdramon", () => {
  it("reveals five, plays a qualifying black Tamer, and de-digivolves an opposing stack", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT11-092"], hand: [{ card: "LM-025", as: "cyberdramon" }], deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
      1: { battleArea: [{ card: "BT1-081", as: "target", under: ["BT1-015"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092")).toBe(true);
    expect(s.state.players[1]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-015")!.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
  });

  it("does not de-digivolve when no qualifying Tamer is revealed", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-025", as: "cyberdramon" }], deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
      1: { battleArea: [{ card: "BT1-081", as: "target", under: ["BT1-015"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-025"));
    expect(s.state.players[1]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-081")!.stack).toHaveLength(1);
  });
});
