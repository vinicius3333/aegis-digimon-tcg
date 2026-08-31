import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-019.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-019 Sorcermon", () => {
  it("has Blocker, grants Ice-Snow, and unsuspends when the opponent has no stacked Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      condition: { kind: "opponentHasNone" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Ice-Snow"],
    });
  });
  it("inherits once-per-turn top evolution trash", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          fromTop: true,
          target: { filter: { digivolutionCards: "hasAny" } },
        },
      ],
    }));

  it("unsuspends one of my Digimon when the opponent has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-019", as: "sorcer", suspended: true },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-010" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sorcer"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => !permanent.isSuspended));
    expect(s.state.players[0]!.battleArea.some((permanent) => !permanent.isSuspended)).toBe(true);
  });
});
