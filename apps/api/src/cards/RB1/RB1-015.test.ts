import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import {
  blitzThroughCopiedGammamon,
  digivolveOverWhenDigivolvingGammamon,
  hiroWasPlayed,
  hostDpWithGammamonInheritedSource,
} from "./gammamonCopy.testSupport.js";

describe("RB1-015 Fumamon", () => {
  it("trashes up to three cards under a low-DP opponent and restricts attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-012", as: "base" }], hand: [{ card: "RB1-015", as: "fumamon" }] },
      1: {
        battleArea: [{ card: "EX2-045", as: "target", under: ["RB1-017", "BT1-009", "RB1-020"] }],
      },
    });

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("fumamon"), "Evade")).toBe(true);
  });

  it("does not affect an opponent Digimon above Fumamon's DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-012", as: "base" }], hand: [{ card: "RB1-015", as: "fumamon" }] },
      1: { battleArea: [{ card: "RB1-024", as: "target", under: ["RB1-017"] }] },
    });

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fumamon").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("target").stack).toHaveLength(1);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(false);
  });

  it("does not copy inherited effects from a Gammamon source card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-015", as: "fumamon", under: [{ card: "RB1-005" }] }] },
    });
    await s.ready();

    expect(s.perm("fumamon").currentDP).toBe(9000);
  });
});

describe("RB1-015 Fumamon — KB Q&A rulings", () => {
  it("triggers the [When Digivolving] effect gained from a Gammamon-named digivolution card (Q4090)", async () => {
    const s = await digivolveOverWhenDigivolvingGammamon("RB1-015");

    expect(s.perm("host").topCard.cardId).toBe("RB1-015");
    expect(hiroWasPlayed(s)).toBe(true);
  });

  it("activates a gained [When Digivolving] ＜Blitz＞ and attacks while the opponent has memory (Q4091)", async () => {
    const s = await blitzThroughCopiedGammamon("RB1-015");

    expect(s.perm("host").topCard.cardId).toBe("RB1-015");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not activate a Gammamon-named source's inherited effect a second time as its own (Q4092)", async () => {
    expect(await hostDpWithGammamonInheritedSource([], "RB1-015")).toBe(7000 + 2000);
    expect(await hostDpWithGammamonInheritedSource(["RB1-015"], "RB1-010")).toBe(11000 + 2000);
  });
});
