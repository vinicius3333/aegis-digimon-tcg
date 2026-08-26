import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-027.js";

describe("BT18-027 Mermaimon", () => {
  it.each([
    ["a blue level 3 Digimon", "BT1-030"],
    ["a Tamer of any color", "BT1-087"],
  ])("plays %s from its digivolution cards when attacking", async (_label, candidate) => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          target: {
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] },
            orFilters: [{ controller: "mine", kind: ["Tamer"] }],
          },
        },
      ],
    });
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-027", as: "mermaimon", under: [candidate] }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mermaimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === candidate)).toBe(true);
  });

  it("does not play a near-matching non-blue level 3 Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-027", as: "mermaimon", under: ["BT1-010"] }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mermaimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("mermaimon").stack.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("may decline the play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-027", as: "mermaimon", under: ["BT1-030"] }] } },
      { autoSelectCards: true, autoAcceptOptional: false },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mermaimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("mermaimon").stack.some((card) => card.cardId === "BT1-030")).toBe(true);
  });

  it("digivolves from a blue level 4 for 3 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-024", as: "base", under: ["BT18-021"] }],
        hand: [{ card: "BT18-027", as: "mermaimon" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mermaimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-027");

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT18-021", "BT18-024"]);
  });
});
