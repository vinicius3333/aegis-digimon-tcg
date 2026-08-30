import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-109.js";

async function resolveMain(s: ReturnType<typeof setupEngine>, optionId: string): Promise<void> {
  const engine = s.engine as unknown as {
    buildEffectContext(source: unknown, trigger: unknown): any;
    cardSourceOf(instance: any): unknown;
  };
  const source = engine.cardSourceOf(s.inst(optionId));
  const effects = getEffectModule("BT13-109")!.effectsForTiming(EffectTiming.OnUseOption, source as never);
  const context = engine.buildEffectContext(source, {});
  for (const effect of effects) await effect.resolve(context);
}

describe("BT13-109 BT13-109", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.length).toBeGreaterThan(0);
    expect(compiled.effects[0]?.actions[1]).toMatchObject({
      kind: "Digivolve",
      into: { nameOrTrait: [{ tokens: ["Belphemon: Sleep Mode"], match: "nameExact" }] },
    });
  });

  it("bounds the security deletion by the level of the trashed hand card", () => {
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Delete",
      cost: {
        kind: "trash",
        bindResultAs: "trashedHandDigimon",
        target: { filter: { zone: "hand", kind: ["Digimon"] } },
      },
      target: {
        filter: {
          controller: "opponent",
          kind: ["Digimon"],
          relativeTo: { attr: "level", op: "lte", selectionRef: "trashedHandDigimon" },
        },
      },
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-109", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-109");
  });

  it("deletes an opponent Digimon at or below the trashed hand Digimon's level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-109", as: "gift" }],
          hand: [{ card: "BT13-077", as: "payment" }],
        },
        1: { battleArea: [{ card: "BT13-077", as: "level-six" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.Security, s.perm("gift"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not trash the payment when no opponent Digimon is within its level bound", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-109", as: "gift" }],
          hand: [{ card: "BT13-077", as: "payment" }],
        },
        1: { battleArea: [{ card: "BT13-092", as: "level-seven" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.Security, s.perm("gift"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("digivolves a legal level 5 purple Digimon into Sleep Mode from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-084", as: "base" }],
          hand: [{ card: "BT13-109", as: "option" }],
          trash: [{ card: "BT13-088", as: "sleep" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await resolveMain(s, "option");

    expect(s.perm("base").topCard?.cardId).toBe("BT13-088");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-084")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("rejects a level 4 base because the effect does not ignore requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "base" }],
          hand: [{ card: "BT13-109", as: "option" }],
          trash: [{ card: "BT13-088", as: "sleep" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await resolveMain(s, "option");

    expect(s.perm("base").topCard?.cardId).toBe("BT13-083");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-088")).toBe(true);
  });
});
