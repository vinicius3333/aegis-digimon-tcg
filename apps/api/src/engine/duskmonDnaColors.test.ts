import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const COLORS = ["Red", "Blue", "Yellow", "Green", "Black", "Purple"];
const FILLER = Array.from({ length: 8 }, () => "BT1-010");

async function changedMaterials(color = "Red", target = "EX13-021", partner = "BT1-081") {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT18-078", as: "duskmon" }], deck: FILLER },
      1: {
        battleArea: [
          { card: target, as: "changed", under: ["EX13-008"] },
          { card: partner, as: "partner" },
        ],
        hand: [
          { card: "BT13-059", as: "examon" },
          { card: "EX3-024", as: "slayerdramon" },
        ],
        deck: FILLER,
      },
    },
    {
      autoSelectCards: true,
      autoAcceptOptional: true,
      preferOptionIndex: COLORS.indexOf(color),
      preferInstanceIds: preferred,
    },
  );
  preferred.push(s.perm("changed").permanentId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("duskmon").instanceId })).toEqual({ ok: true });
  await settle(
    () => observe(s.engine).effectiveColors(s.perm("changed")).includes(color) && s.state.pendingDecision === undefined,
  );
  s.state.turnSeat = 1;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  return { s, turn };
}

describe("Discord 1557565628439724032 — DNA uses current material colors", () => {
  it.each([false, true])("rejects changed colors in both material orders (reverse=%s)", async (reverse) => {
    const { s, turn } = await changedMaterials();
    expect(observe(s.engine).effectiveColors(s.perm("changed"))).toEqual(["Red"]);
    expect(s.inst("examon").dnaDigivolveRoutes).toHaveLength(0);
    const ids = [s.perm("changed").permanentId, s.perm("partner").permanentId];
    const before = [...s.state.players[1]!.battleArea];
    const memory = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "dnaDigivolve",
        instanceId: s.inst("examon").instanceId,
        materialPermanentIds: reverse ? ids.reverse() : ids,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect([...s.state.players[1]!.battleArea]).toEqual(before);
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it.each([false, true])(
    "retains Duskmon's color after normal evolution and rejects DNA (reverse=%s)",
    async (reverse) => {
      const { s, turn } = await changedMaterials();
      const permanentId = s.perm("changed").permanentId;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId,
          useAlternateCost: true,
          instanceId: s.inst("slayerdramon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("changed").topCard.cardId === "EX3-024" && s.state.pendingDecision === undefined);
      expect(s.perm("slayerdramon").permanentId).toBe(permanentId);
      expect(observe(s.engine).effectiveColors(s.perm("slayerdramon"))).toEqual(["Red"]);
      expect(s.inst("examon").dnaDigivolveRoutes).toHaveLength(0);
      const ids = [permanentId, s.perm("partner").permanentId];
      expect(
        s.engine.applyIntent(1, {
          type: "dnaDigivolve",
          instanceId: s.inst("examon").instanceId,
          materialPermanentIds: reverse ? ids.reverse() : ids,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await turn;
      assertNoLoudGap(s);
    },
  );

  it("does not offer inherited end-of-turn DNA when the changed color removes the recipe", async () => {
    const { s, turn } = await changedMaterials();
    const before = s.decisions.length;
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-021", "BT1-081"]);
    expect(s.state.players[1]!.hand.some((c) => c.cardId === "BT13-059")).toBe(true);
    expect(s.decisions.slice(before).some(({ req }) => req.sourceCardId === "EX13-008")).toBe(false);
    // The override lasts through this turn and expires after its end.
    expect(observe(s.engine).effectiveColors(s.perm("changed"))).toEqual(["Blue", "Red"]);
    assertNoLoudGap(s);
  });

  it.each([false, true])(
    "allows a legitimately changed green material and stacks it in printed order (reverse=%s)",
    async (reverse) => {
      const { s, turn } = await changedMaterials("Green", "EX13-021", "EX3-024");
      expect(observe(s.engine).effectiveColors(s.perm("changed"))).toEqual(["Green"]);
      expect(s.inst("examon").dnaDigivolveRoutes).toHaveLength(1);
      const changedId = s.inst("changed").instanceId;
      const partnerId = s.inst("partner").instanceId;
      const ids = [s.perm("changed").permanentId, s.perm("partner").permanentId];
      expect(
        s.engine.applyIntent(1, {
          type: "dnaDigivolve",
          instanceId: s.inst("examon").instanceId,
          materialPermanentIds: reverse ? ids.reverse() : ids,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT13-059") &&
          s.state.pendingDecision === undefined,
      );
      const result = s.perm("examon");
      expect(result.stack[0]!.instanceId).toBe(partnerId);
      expect(result.stack[result.stack.length - 1]!.instanceId).toBe(changedId);
      expect(observe(s.engine).effectiveColors(result)).toEqual(["Green", "Blue"]);
      expect(result.isSuspended).toBe(false);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await turn;
      assertNoLoudGap(s);
    },
  );

  it("permits inherited end-of-turn DNA after a legitimate green color change", async () => {
    const { s, turn } = await changedMaterials("Green", "EX13-021", "EX3-024");
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT13-059"]);
    expect(s.perm("examon").stack.map((c) => c.cardId)).toEqual(["EX3-024", "EX13-008", "EX13-021"]);
    expect(observe(s.engine).effectiveColors(s.perm("examon"))).toEqual(["Green", "Blue"]);
    assertNoLoudGap(s);
  });

  it("retains legitimately gained yellow after Duskmon changes Kimeramon's original color", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-078", as: "duskmon" }], deck: FILLER },
        1: {
          battleArea: [
            { card: "BT8-084", as: "kimeramon", under: ["BT1-045"] },
            { card: "BT2-075", as: "purple" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          deck: FILLER,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("kimeramon").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("duskmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).effectiveColors(s.perm("kimeramon")).includes("Red") && s.state.pendingDecision === undefined,
    );
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).effectiveColors(s.perm("kimeramon"))).toEqual(["Red", "Yellow"]);
    expect(s.inst("mastemon").dnaDigivolveRoutes).toHaveLength(1);
    expect(
      s.engine.applyIntent(1, {
        type: "dnaDigivolve",
        instanceId: s.inst("mastemon").instanceId,
        materialPermanentIds: [s.perm("purple").permanentId, s.perm("kimeramon").permanentId],
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST10-06") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("mastemon").stack.map((c) => c.cardId)).toEqual(["BT2-075", "BT1-045", "BT8-084"]);
    expect(observe(s.engine).effectiveColors(s.perm("mastemon"))).toEqual(["Yellow", "Purple"]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it.each([false, true])("healthy unaltered colors still DNA digivolve (reverse=%s)", async (reverse) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-081", as: "green" },
            { card: "EX3-024", as: "blue" },
          ],
          hand: [{ card: "BT13-059", as: "examon" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    const ids = [s.perm("green").permanentId, s.perm("blue").permanentId];
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: s.inst("examon").instanceId,
        materialPermanentIds: reverse ? ids.reverse() : ids,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-059") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("examon").stack.map((c) => c.cardId)).toEqual(["EX3-024", "BT1-081"]);
    assertNoLoudGap(s);
  });
});
