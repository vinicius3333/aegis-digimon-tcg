import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST13-06.js";

describe("ST13-06 RagnaLoardmon", () => {
  it("DNA digivolves with 8 sources to gain Blitz, delete 2, and trash 2 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "red", under: ["ST13-02", "ST13-03", "ST13-04"] },
            { card: "ST13-14", as: "black", under: ["ST13-11", "ST13-12", "ST13-13"] },
          ],
          hand: [{ card: "ST13-06", as: "ragnaLoardmon" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("red").permanentId, s.perm("black").permanentId],
        instanceId: s.inst("ragnaLoardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const ragna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST13-06");
      return (
        Boolean(ragna) &&
        observe(s.engine).hasKeyword(ragna!, "Blitz") &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 1
      );
    });

    const ragna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST13-06")!;
    expect(ragna.stack).toHaveLength(8);
    expect(observe(s.engine).hasKeyword(ragna, "Blitz")).toBe(true);
    assertNoLoudGap(s);
  });

  it("gains Blitz but does not run the DNA-only removal on an ordinary digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-05", as: "red", under: ["ST13-02", "ST13-03", "ST13-04"] }],
        hand: [{ card: "ST13-06", as: "ragnaLoardmon" }],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "target" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("red").permanentId,
        instanceId: s.inst("ragnaLoardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("red").topCard.cardId === "ST13-06" && observe(s.engine).hasKeyword(s.perm("red"), "Blitz"),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("red"), "Blitz")).toBe(true);
  });

  it("deletes exactly one target with four DNA sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "red", under: ["ST13-04"] },
            { card: "ST13-14", as: "black", under: ["ST13-13"] },
          ],
          hand: [{ card: "ST13-06", as: "ragnaLoardmon" }],
        },
        1: {
          battleArea: [
            { card: "BT9-112", as: "cost20" },
            { card: "BT1-009", as: "cost2" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("red").permanentId, s.perm("black").permanentId],
        instanceId: s.inst("ragnaLoardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("ragnaLoardmon").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-06")).toBe(true);
  });

  it("unsuspends once per turn when either player loses security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-06", as: "ragna", suspended: true }],
        security: ["BT1-001", "BT1-002"],
      },
      1: {
        security: ["BT1-003", "BT1-004", "BT1-005"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => !s.perm("ragna").isSuspended);
    expect(s.perm("ragna").isSuspended).toBe(false);

    s.perm("ragna").isSuspended = true;
    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    await settle();
    expect(s.perm("ragna").isSuspended).toBe(true);
  });
});
