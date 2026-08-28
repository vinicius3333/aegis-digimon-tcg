import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-029.js";
import "./BT11-112.js";

describe("BT11-029 AeroVeedramon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-029")).toMatchObject({
      cardId: "BT11-029",
      nameEn: "AeroVeedramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Dragon"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "Main",
          frequency: "OncePerTurn",
          actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", cost: { kind: "suspend" } }],
        },
        {
          trigger: "Static",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenAttacking", actions: [{ kind: "ActivateEffect" }] }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from blue level 4 for 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-027", as: "base" }], hand: [{ card: "BT11-029", as: "aero" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aero").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-029");
    expect(s.state.memory).toBe(2);
  });
  it("suspends itself, adds all revealed blue Tamers and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-029", as: "aero" }],
        deck: [
          { card: "BT11-090", as: "blue1" },
          { card: "BT11-112", as: "blue2" },
          { card: "BT1-009", as: "rest" },
        ],
      },
    });
    await s.ready();
    const effect = observe(s.engine).activatableEffects(s.perm("aero")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("aero").topCard!.instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.perm("aero").isSuspended).toBe(true);
    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("blue1").instanceId);
    expect(handIds).toContain(s.inst("blue2").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("rest").instanceId);

    await advance(s.engine).verb.unsuspend([s.perm("aero").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("aero").topCard!.instanceId,
        effectKey: effect[0]!.effectKey,
      }).ok,
    ).toBe(false);
  });

  it("inherited effect activates a Rina Shinomiya On Play effect when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-033", as: "host", under: ["BT11-029"] },
            { card: "BT11-112", as: "rina" },
            { card: "BT11-023", as: "veemon" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("host").permanentId });

    expect(observe(s.engine).hasKeyword(s.perm("veemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("veemon"), "Evade")).toBe(true);
  });

  it("does not activate Rina for another Digimon's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-033", as: "host", under: ["BT11-029"] },
            { card: "BT11-027", as: "other" },
            { card: "BT11-112", as: "rina" },
            { card: "BT11-023", as: "veemon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("other").permanentId });
    expect(observe(s.engine).hasKeyword(s.perm("veemon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("veemon"), "Evade")).toBe(false);
  });
});
