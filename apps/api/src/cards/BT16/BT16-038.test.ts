import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-038.js";
import "../index.js";

describe("BT16-038", () => {
  it("reduces the cost of its own Gargomon or Rapidmon digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("grants inherited Piercing to Gargomon or Rapidmon", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } }],
    });
  });

  it("encodes the Gummymon or Terriermon alternate evolution", () => {
    expect(digivolutionRequirementsFor("BT16-038")).toEqual([
      { names: ["Gummymon", "Terriermon"], cost: 0, isAlternate: true },
    ]);
  });

  it("naturally evolves from Terriermon through the zero-cost alternate route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-02", as: "terriermon" }], hand: [{ card: "BT16-038", as: "xTerriermon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("terriermon").permanentId,
        instanceId: s.inst("xTerriermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard?.cardId === "BT16-038");

    expect(s.perm("terriermon").stack.map((card) => card.cardId)).toEqual(["ST17-02", "BT16-038"]);
    expect(s.state.memory).toBe(0);
  });

  it("naturally reduces a Gargomon evolution by one and leaves a nonmatching evolution at full cost", async () => {
    const reduced = setupEngine({
      0: { battleArea: [{ card: "BT16-038", as: "terrier" }], hand: [{ card: "BT17-046", as: "gargomon" }] },
    });
    reduced.state.memory = 1;
    await reduced.ready();

    expect(
      reduced.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: reduced.perm("terrier").permanentId,
        instanceId: reduced.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => reduced.perm("terrier").topCard?.cardId === "BT17-046");
    expect(reduced.state.memory).toBe(0);

    const fullCost = setupEngine({
      0: { battleArea: [{ card: "BT16-038", as: "terrier" }], hand: [{ card: "BT16-042", as: "blade" }] },
    });
    fullCost.state.memory = 2;
    await fullCost.ready();

    expect(
      fullCost.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fullCost.perm("terrier").permanentId,
        instanceId: fullCost.inst("blade").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => fullCost.perm("terrier").topCard?.cardId === "BT16-042");
    expect(fullCost.state.memory).toBe(0);
  });

  it("naturally grants Piercing after evolving into Gargomon and checking security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-038", as: "terrier" }],
          hand: [{ card: "BT17-046", as: "gargomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", suspended: true }],
          security: ["BT1-090"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("terrier").permanentId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terrier").topCard?.cardId === "BT17-046");
    expect(observe(s.engine).hasPierce(s.perm("terrier"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("terrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not grant inherited Piercing while the host keeps a nonmatching name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-042", as: "blade", under: ["BT16-038"] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasPierce(s.perm("blade"))).toBe(false);
  });
});
