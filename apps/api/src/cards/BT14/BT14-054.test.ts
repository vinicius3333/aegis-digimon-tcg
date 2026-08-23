import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-054.js";

describe("BT14-054", () => {
  it("has Piercing and suspends an opposing Digimon by unsuspending itself on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      keywords: [{ keyword: "Piercing" }],
      actions: [{ kind: "Suspend", cost: { kind: "unsuspend", target: { isSelf: true } } }],
    }));
  it("attacks an opposing Digimon at end of your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: false,
      target: { filter: { controller: "opponent" } },
    }));

  it("unsuspends itself as cost and suspends an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.isSuspended));
    expect(s.state.players[1]!.battleArea.some((p) => p.isSuspended)).toBe(true);
  });
});
