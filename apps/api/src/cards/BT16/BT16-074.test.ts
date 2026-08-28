import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-074.js";

describe("BT16-074", () => {
  it("uses independent security branches and schedules the next-turn deletion", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      condition: { kind: "securityAtLeast", value: 3 },
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Trash",
      target: { count: 1 },
      condition: { kind: "securityAtLeast", value: 3 },
    });
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: { kind: "securityAtMost", value: 3 },
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it("runs both security branches at exactly three during a legal alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-043", as: "source" }],
          hand: [{ card: "BT16-074", as: "climb" }, "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          trash: [{ card: "BT16-043", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("climb").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard?.cardId === "BT16-074" &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-043"),
    );

    expect(s.perm("source").topCard?.cardId).toBe("BT16-074");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-043")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });
});
