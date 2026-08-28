import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-050.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-050 Sunflowmon", () => {
  it("charges suspension for the Fairy digivolution and reduces its cost by two", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          optional: true,
          abortOnDecline: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Fairy"] }] },
          payCost: true,
          reduceCost: 2,
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              mode: "reduceCost",
              amount: 1,
              condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Green"] } },
            },
          ],
        },
      ],
    });
  });

  it("suspends itself and evolves an own Digimon into a hand Fairy for 2 less", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-051", as: "target" }, { card: "BT13-050", as: "sunflow" }], hand: [{ card: "BT13-054", as: "lilamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseOption, s.perm("sunflow"));
    await settle(() => s.perm("target").topCard.cardId === "BT13-054");
    expect(s.perm("sunflow").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("does not suspend or evolve when no Fairy card is available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-050", as: "sunflow" }], hand: ["BT10-054"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseOption, s.perm("sunflow"));
    expect(s.perm("sunflow").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline the Main effect without suspending or evolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-050", as: "sunflow" }], hand: ["BT13-054"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseOption, s.perm("sunflow"));
    expect(s.perm("sunflow").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("inherited reduction applies once with an own green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-049", as: "host", under: ["BT13-050"] },
          { card: "BT13-100", as: "yoshino" },
        ],
        hand: [{ card: "BT13-050", as: "next" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("next").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-050");
    expect(s.state.memory).toBe(2);
  });

  it("normally digivolves from a green level 3 for exactly 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-049", as: "base" }], hand: [{ card: "BT13-050", as: "sunflow" }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("sunflow").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-050");
    expect(s.state.memory).toBe(1);
  });
});
