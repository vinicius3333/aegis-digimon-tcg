import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT9-031.js";

describe("BT9-031 MetalGarurumon (X Antibody)", () => {
  it("matches catalog and complete Q1829/Q1830 IR", () => {
    expect(getCardDefinition("BT9-031")).toMatchObject({
      cardId: "BT9-031", nameEn: "MetalGarurumon (X Antibody)", colors: ["Blue"], kinds: ["Digimon"], level: 6,
      playCost: 12, dp: 12000, evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }], forms: ["Mega"],
      attributes: ["Data"], types: ["Cyborg", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["MetalGarurumon"], cost: 1, isAlternate: true }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend" }, { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" }] },
        { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenUnsuspended", actions: [{ kind: "Return", to: "hand", target: { filter: { superlative: "lowestLevel" }, count: "all" } }] }] },
      ],
    });
  });

  it("unsuspends itself and gains Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-044", as: "base", suspended: true }],
        hand: [{ card: "BT9-031", as: "evolving" }],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-031"));
    expect(s.perm("base").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("once per turn returns all opposing Digimon tied for the lowest level when it unsuspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-031", as: "metal", under: ["BT1-044"] }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT9-008", as: "second" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const returnedIds = [s.perm("first").topCard!.instanceId, s.perm("second").topCard!.instanceId];
    await advance(s.engine).fireSubTrigger("whenUnsuspended", { unsuspendedPermanentId: s.perm("metal").permanentId });
    expect(returnedIds.every((id) => s.state.players[1]!.hand.some((card) => card.instanceId === id))).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not treat MetalGarurumon (X Antibody) as an exact enabling source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-039", as: "base", under: ["BT9-031"], suspended: true }],
        hand: [{ card: "BT9-031", as: "evolving" }],
      },
      1: { battleArea: [{ card: "BT1-028", as: "lowest" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId && !s.perm("base").isSuspended,
    );
    await settle();

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("lowest").permanentId)).toBe(
      true,
    );
  });
});
