import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_052 } from "./BT24-052.js";
import "../index.js";

describe("BT24-052 Keramon (X Antibody)", () => {
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
  it("matches the Diaboromon name family for its optional paid replacement", () => {
    const inherited = BT24_052.effects?.find((entry) => entry.isInherited);
    const replacement = inherited?.actions?.[0] as any;
    const prevent = replacement.actions?.[0];
    expect(prevent.cost).toMatchObject({ kind: "deleteOwn", raw: "by deleting 1 of your other [Diaboromon]" });
    expect(prevent).toMatchObject({ optional: true, abortOnDecline: true });
    expect(prevent.cost.target.filter).toMatchObject({
      nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
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

  it("protects its own Diaboromon-text host by deleting a named Diaboromon variant", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-065", as: "host", under: ["BT24-052"] },
            { card: "BT24-065", as: "cost" },
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
