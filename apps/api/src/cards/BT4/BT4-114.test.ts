import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-114.js";

describe("BT4-114 AncientGarurumon", () => {
  it("encodes KendoGarurumon as an exact-name exclusion", () => {
    const compiled = runtimeCompiledCard("BT4-114");
    expect(compiled?.effects[0]?.actions[0]).toMatchObject({
      target: {
        filter: {
          or: [
            expect.objectContaining({
              excludeNameOrTrait: [{ tokens: ["KendoGarurumon"], match: "nameExact" }],
            }),
            expect.anything(),
          ],
        },
      },
    });
  });

  it("unsuspends an own Hybrid Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-114", as: "ancient", under: ["BT1-038"] },
            { card: "BT12-024", as: "hybrid", suspended: true },
            { card: "BT12-023", as: "other", suspended: true },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancient").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("hybrid").isSuspended);
    expect(s.perm("ancient").isSuspended).toBe(false);
    expect(s.perm("hybrid").isSuspended).toBe(false);
    expect(s.perm("other").isSuspended).toBe(true);
  });

  it("counts KendoGarurumon through its Hybrid trait while capping at two targets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-114", as: "ancient", under: ["BT1-038"] },
            { card: "BT17-023", as: "kendo", suspended: true },
            { card: "BT12-023", as: "other", suspended: true },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancient").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("kendo").isSuspended);
    expect(s.perm("kendo").isSuspended).toBe(false);
    expect(s.perm("other").isSuspended).toBe(true);
  });

  it("does not play a Hybrid when the optional deletion effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-114", as: "ancient", under: ["BT1-038"] }],
          hand: [{ card: "BT12-024", as: "hybrid" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-024")).toBe(true);
  });

  it("may play a blue level 4 or lower Hybrid from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-114", as: "ancient", under: ["BT1-038"] }],
          hand: [{ card: "BT12-024", as: "hybrid" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-024"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-024")).toBe(true);
  });
});
