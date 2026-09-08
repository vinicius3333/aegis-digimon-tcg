import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_052 } from "./BT24-052.js";
import "../index.js";

describe("BT24-052 Keramon (X Antibody)", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-052")).toMatchObject({
      cardId: "BT24-052",
      nameEn: "Keramon (X Antibody)",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 3000,
      forms: ["Rookie"],
      attributes: ["Unknown"],
      types: ["Unidentified", "X Antibody"],
    });
  });

  it("plays a Diaboromon Token on both printed timings", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      expect(BT24_052.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "PlayToken",
        tokens: ["Diaboromon"],
        count: 1,
        payCost: false,
        optional: true,
      });
    }
  });
  it("requires the exact Diaboromon name for its optional paid replacement", () => {
    const inherited = BT24_052.effects?.find((entry) => entry.isInherited);
    const replacement = inherited?.actions?.[0] as {
      actions?: Array<{
        cost?: { kind?: string; raw?: string; target?: { filter?: Record<string, unknown> } };
        optional?: boolean;
        abortOnDecline?: boolean;
      }>;
    };
    const prevent = replacement.actions?.[0];
    if (prevent?.cost?.target?.filter === undefined) throw new Error("replacement cost target filter missing");
    expect(prevent.cost).toMatchObject({ kind: "deleteOwn", raw: "by deleting 1 of your other [Diaboromon]" });
    expect(prevent).toMatchObject({ optional: true, abortOnDecline: true });
    expect(prevent.cost.target.filter).toMatchObject({
      nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }],
    });
  });

  it("digivolves from Keramon for cost 0 and plays a Diaboromon Token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-053", as: "keramon" }],
          hand: [{ card: "BT24-052", as: "xAntibody" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("keramon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("keramon").topCard.instanceId === s.inst("xAntibody").instanceId);
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.startsWith("TOKEN-"))).toBe(
      true,
    );
  });

  it("uses its normal black level-2 evolution requirement for cost 1", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT17-005", as: "egg" },
        hand: [{ card: "BT24-052", as: "xAntibody" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("xAntibody").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("rejects a public evolution from a purple level-2 Digi-Egg source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT17-006", as: "wrongColorEgg" }, hand: [{ card: "BT24-052", as: "xAntibody" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongColorEgg").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("wrongColorEgg").topCard.instanceId).toBe(s.inst("wrongColorEgg").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("xAntibody").instanceId);
  });

  it("public When Moving plays a Diaboromon Token", async () => {
    const s = setupEngine(
      { 0: { breeding: { card: "BT24-052", as: "mover" } } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.perm("mover").inBreeding).toBe(false);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId.startsWith("TOKEN-")),
    ).toHaveLength(1);
  });

  it("protects its own Diaboromon-text host by deleting another exact Diaboromon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", under: ["BT24-052"] },
            { card: "BT17-059", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const costId = s.perm("cost").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(false);
  });

  it("publicly protects the host by paying with an exact Diaboromon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", dp: 1000, under: ["BT24-052"] },
            { card: "BT17-059", as: "exactCost", dp: 13000 },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const exactCostId = s.inst("exactCost").instanceId;
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === exactCostId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("publicly leaves the host when the only other permanent has the wrong name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", dp: 1000, under: ["BT24-052"] },
            { card: "BT1-009", as: "wrongName", dp: 13000 },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const wrongNameId = s.perm("wrongName").permanentId;
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === wrongNameId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("publicly allows departure when the replacement cost is refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", dp: 1000, under: ["BT24-052"] },
            { card: "BT17-059", as: "exactCost", dp: 13000 },
          ],
        },
        1: { battleArea: [{ card: "BT24-085", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const exactCostId = s.perm("exactCost").permanentId;
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === exactCostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("publicly protects a simultaneous multi-target removal, then is spent on the second origin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "hostA", dp: 1000, under: ["BT24-052"] },
            { card: "BT24-065", as: "hostB", dp: 1000, under: ["BT24-052"] },
            { card: "BT17-059", as: "costA" },
            { card: "BT17-059", as: "costB" },
          ],
          security: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT24-085", as: "redSource" }],
          hand: [
            { card: "BT6-095", as: "firstRemoval" },
            { card: "BT6-095", as: "secondRemoval" },
          ],
          security: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstRemoval").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT24-065").length === 2,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("costA").instanceId, s.inst("costB").instanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstRemoval").instanceId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondRemoval").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT24-065").length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hostA").instanceId, s.inst("hostB").instanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondRemoval").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the deletion cost and let the host leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", under: ["BT24-052"] },
            { card: "BT17-059", as: "cost" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const costId = s.perm("cost").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(true);
  });

  it("does not protect a neighboring Diaboromon-text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", under: ["BT24-052"] },
            { card: "BT24-065", as: "neighbor" },
            { card: "BT17-059", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const neighborId = s.perm("neighbor").permanentId;
    const costId = s.perm("cost").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([neighborId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === neighborId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(true);
  });

  it("prevents leaving only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", under: ["BT24-052"] },
            { card: "BT17-059", as: "firstCost" },
            { card: "BT17-059", as: "secondCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-059")).toHaveLength(
      1,
    );
  });
});
