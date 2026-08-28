import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-052.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-052 SymbareAngoramon", () => {
  it("registers Jamming and the inherited empty-opponent-board aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Jamming" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: {
            kind: "opponentHasNone",
            filter: { controllerDefault: "opponent", zone: "battleArea", unsuspended: true, kind: ["Digimon"] },
            raw: expect.stringContaining("no unsuspended Digimon"),
          },
        },
      ],
    });
  });

  it("exposes Jamming on the live SymbareAngoramon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-052", as: "symbare" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Jamming")).toBe(true);
  });

  it("does not inherit Jamming but gives its host +1000 with no opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-051", as: "host", under: ["BT13-052"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("dynamically suppresses the inherited bonus only for an unsuspended opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-051", as: "host", under: ["BT13-052"] }] },
      1: { battleArea: [{ card: "BT13-047", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
    s.perm("opponent").isSuspended = false;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("does not count an unsuspended opposing breeding Digimon for the inherited bonus", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-051", as: "host", under: ["BT13-052"] }] },
      1: { breeding: { card: "BT1-015", as: "breedingOpponent" } },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("digivolves from a green level 3 for exactly 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-049", as: "base" }], hand: [{ card: "BT13-052", as: "symbare" }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("symbare").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-052");
    expect(s.state.memory).toBe(1);
  });
});
