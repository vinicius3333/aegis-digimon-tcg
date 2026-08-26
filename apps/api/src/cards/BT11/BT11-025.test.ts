import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-025.js";

describe("BT11-025 Gaogamon", () => {
  it("matches the catalog and carries both complete attack watchers", () => {
    expect(getCardDefinition("BT11-025")).toMatchObject({
      cardId: "BT11-025",
      nameEn: "Gaogamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beast"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttacking" }] },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "Return" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from blue level 3 for 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-020", as: "base" }], hand: [{ card: "BT11-025", as: "gaogamon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-025");
    expect(s.state.memory).toBe(2);
  });
  it("gains 1 memory when attacking while the opponent has 8 cards in hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-025", as: "gaogamon" }] },
      1: { hand: Array.from({ length: 8 }, () => "BT1-001") },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaogamon").permanentId });

    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaogamon").permanentId });
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory below the 8-card threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-025", as: "gaogamon" }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-001") },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaogamon").permanentId });

    expect(s.state.memory).toBe(0);
  });

  it("inherited effect returns an opponent level 3 when its host attacks with a Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-028", as: "host", under: ["BT11-025"] },
            { card: "BT1-086", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT11-023", as: "target" },
            { card: "BT11-023", as: "second" },
            { card: "BT11-025", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT11-025")).toBe(true);
  });
});
