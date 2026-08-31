import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-149.js";

describe("P-149 Minomon", () => {
  it("encodes the inherited once-per-turn hand-costed deletion", () => {
    const compiled = runtimeCompiledCard("P-149")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Delete",
              optional: true,
              abortOnDecline: true,
              target: expect.objectContaining({
                filter: { controller: "opponent", kind: ["Digimon"], levels: [3] },
                count: 1,
              }),
              condition: expect.objectContaining({ kind: "selfColorCount", value: 2 }),
              cost: expect.objectContaining({
                kind: "trash",
                target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("trashes a card to delete an opposing level-3 Digimon when the host has two colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-152", as: "host", under: ["P-149"] }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "level3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
