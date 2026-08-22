import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-040";

describe("BT26-040 Drimogemon", () => {
  it("uses the exact off-color Lv.3 DM alternate evolution for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-014", as: "blueDm" }],
        hand: [{ card: CARD_ID, as: "drimogemon" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueDm").permanentId,
        instanceId: s.inst("drimogemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueDm").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("On Play suspends only an unsuspended opponent Digimon, places one hand card face down at bottom, and gains DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "drimogemon" },
            { card: "AD1-001", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-022", as: "opponent" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drimogemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.currentDP === 6000 &&
          permanent.stack.some((card) => card.instanceId === s.inst("material").instanceId),
      ),
    );
    const drimogemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(drimogemon.stack[0]).toMatchObject({ instanceId: s.inst("material").instanceId, faceUp: false });
    expect(drimogemon.currentDP).toBe(6000);
  });

  it("When Moving resolves for itself and not for an unrelated move", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          hand: [{ card: "AD1-001", as: "material" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mover").stack.length === 1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("mover").stack[0]!.faceUp).toBe(false);

    expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });

  it("does not gain DP when no hand card is available to place", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "drimogemon" }] },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drimogemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    const drimogemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(drimogemon.stack).toHaveLength(0);
    expect(drimogemon.currentDP).toBe(5000);
  });

  it("inherits Piercing onto a realistic evolution host while standalone behavior remains top-level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-043", as: "host", under: [{ card: CARD_ID, as: "drimogemonSource" }] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);
    expect([...s.perm("standalone").keywords]).toEqual(expect.arrayContaining(["Training", "Piercing"]));
  });
});
