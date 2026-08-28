import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      optional: true,
      actions: [{ kind: "Attack", attackPlayer: false, mandatory: true, target: { filter: { controller: "opponent" } } }],
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

  it("naturally attacks the opposing Digimon from the real end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-054");
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(true);
  });
});
