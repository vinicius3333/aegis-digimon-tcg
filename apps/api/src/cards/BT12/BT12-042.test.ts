import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-042.js";

describe("BT12-042 RizeGreymon", () => {
  it("has the printed 3-cost GeoGreymon evolution route", () => {
    expect(digivolutionRequirementsFor("BT12-042")).toContainEqual({
      names: ["GeoGreymon"],
      cost: 3,
      isAlternate: true,
    });
  });
});

it("recovers Marcus from an inherited RizeGreymon when its Tamer is deleted", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-038", as: "host", under: ["BT12-042"] },
          { card: "BT12-092", as: "tamer" },
        ],
        trash: [{ card: "BT12-092", as: "marcus" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId], "byEffect");
  await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus").instanceId));
  expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("marcus").instanceId, faceUp: false });
});

it("recovers Marcus only when one of its owner's Tamers is deleted", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-042", as: "rize" },
          { card: "BT12-092", as: "tamer" },
        ],
        trash: [{ card: "BT12-092", as: "marcus" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId], "byEffect");
  await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus").instanceId));
  expect(s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus").instanceId)).toBe(true);
});

it("gains 1 memory when digivolving with a yellow or red Tamer in play", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-038", as: "geo" },
        { card: "BT12-092", as: "tamer" },
      ],
      hand: [{ card: "BT12-042", as: "rize" }],
    },
  });
  await s.ready();
  s.state.memory = 4;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("geo").permanentId, s.inst("rize").instanceId, {
    payCost: true,
  });
  await settle(() => s.perm("geo").topCard?.cardId === "BT12-042" && s.state.memory === 1);
  expect(s.state.memory).toBe(1);
});

it("resolves the memory gain through a public digivolution intent", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-038", as: "geo" },
        { card: "BT12-092", as: "tamer" },
      ],
      hand: [{ card: "BT12-042", as: "rize" }],
    },
  });
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("geo").permanentId,
      instanceId: s.inst("rize").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("geo").topCard?.cardId === "BT12-042" && s.state.memory === 1);
  expect(s.state.memory).toBe(1);
});

it("does not gain memory without a yellow or red Tamer", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-038", as: "geo" },
        { card: "BT26-092", as: "blackTamer" },
      ],
      hand: [{ card: "BT12-042", as: "rize" }],
    },
  });
  s.state.memory = 4;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("geo").permanentId, s.inst("rize").instanceId, {
    payCost: true,
  });
  await settle(() => s.perm("geo").topCard.cardId === "BT12-042");
  expect(s.state.memory).toBe(0);
});

it("does not repeat the Marcus recovery during the same turn", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-042", as: "rize" },
          { card: "BT12-092", as: "tamer1" },
          { card: "BT12-092", as: "tamer2" },
        ],
        trash: [
          { card: "BT12-092", as: "marcus1" },
          { card: "BT12-092", as: "marcus2" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).verb.deletePermanent([s.perm("tamer1").permanentId], "byEffect");
  await settle(() =>
    s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("marcus1").instanceId),
  );
  await advance(s.engine).verb.deletePermanent([s.perm("tamer2").permanentId], "byEffect");
  await settle(() => s.state.players[0]!.battleArea.length === 1);
  expect(s.state.players[0]!.security).toHaveLength(1);
});
