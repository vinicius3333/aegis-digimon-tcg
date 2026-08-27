import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-047.js";

describe("BT13-047 Angoramon", () => {
  it("keeps Blocker and the no-unsuspended-opponent aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
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
            filter: { controllerDefault: "opponent", unsuspended: true, kind: ["Digimon"] },
            raw: expect.stringContaining("no unsuspended Digimon"),
          },
        },
      ],
    });
  });

  it("gains the inherited +1000 DP when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", under: ["BT13-047"], as: "host" }] } });
    await s.ready();
    await settle(() => s.perm("host").currentDP === 4000);
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("has live Blocker only as the top card, while the inherited aura belongs to its host", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "BT13-047", as: "angora" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("angora"), "Blocker")).toBe(true);

    const source = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-047"] }] } });
    await source.ready();
    expect(observe(source.engine).hasKeyword(source.perm("host"), "Blocker")).toBe(false);
    expect(source.perm("host").currentDP).toBe(4000);
  });

  it("removes and restores inherited +1000 as opposing Digimon become unsuspended or suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["BT13-047"], as: "host" }] },
      1: { battleArea: [{ card: "BT13-036", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(3000);
    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(4000);
    s.perm("opponent").isSuspended = false;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("digivolves from a green level 2 for zero memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-004", as: "base" }], hand: [{ card: "BT13-047", as: "angora" }] },
    });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("angora").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-047");
    expect(s.state.memory).toBe(1);
  });
});
