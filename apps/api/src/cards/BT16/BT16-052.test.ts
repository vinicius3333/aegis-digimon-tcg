import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-052.js";
import "../index.js";

describe("BT16-052", () => {
  it("optionally plays one KoHagurumon Token on digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayToken", tokens: ["KoHagurumon Token"], count: 1, payCost: false, optional: true }],
    });
  });

  it("has inherited Blocker without adding the token restriction to this card", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("plays a KoHagurumon Token on live digivolution and inherits Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-055", as: "base" },
            { card: "BT16-057", as: "blockerHost", under: ["BT16-052"] },
          ],
          hand: [{ card: "BT16-052", as: "xantibody" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xantibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-KoHagurumon-Token"),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-KoHagurumon-Token"),
    ).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("blockerHost"), "Blocker")).toBe(true);
  });
});
