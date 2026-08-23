import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-063.js";

describe("BT4-063 Commandramon", () => {
  it("reveals 3 and may play a Commandramon for free when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-063", dp: 1000, as: "command" }], deck: ["BT4-063", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT2-083", dp: 12000, suspended: true, as: "defender" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const originalId = s.perm("command").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("command").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === originalId) &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-063"),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-063")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
