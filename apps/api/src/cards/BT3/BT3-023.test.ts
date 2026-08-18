import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-023.js";

describe("BT3-023 Angemon", () => {
  it("trashes the bottom digivolution card of an opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-026", as: "host", under: ["BT3-023"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const sourceId = s.perm("target").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === sourceId), 5000);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
  });

  it("does not alter an opposing Digimon with no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-026", as: "host", under: ["BT3-023"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(false);
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
