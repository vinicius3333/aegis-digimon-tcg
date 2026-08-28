import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-025.js";
describe("BT5-025 Paledramon", () => {
  it("trashes up to two bottom sources from an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT5-025", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", under: ["BT1-010", "BT1-011", "BT1-012"], as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack[0]?.cardId).toBe("BT1-012");
  });
  it("trashes only the available source when the target has one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT5-025", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", under: ["BT1-010"], as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("only targets an opponent Digimon and leaves the bottom-to-top order intact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "base" },
            { card: "BT2-020", under: ["BT1-010", "BT1-011"], as: "own-stack" },
          ],
          hand: [{ card: "BT5-025", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-020", under: ["BT1-012", "BT1-013", "BT1-014"], as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack[0]?.cardId).toBe("BT1-014");
    expect(s.perm("own-stack").stack.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013"]);
  });

  it("does nothing when the chosen opponent Digimon has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT5-025", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("allows choosing only one of two available bottom sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-027", as: "base" }], hand: [{ card: "BT5-025", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", under: ["BT1-010", "BT1-011", "BT1-012"], as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 2);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-012"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });
});
