import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-064.js";

describe("BT12-064 Tuwarmon", () => {
  it("carries and publicly uses the Save-text alternate evolution", async () => {
    expect(digivolutionRequirementsFor("BT12-064")).toContainEqual({
      level: 3,
      texts: ["Save"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-008", as: "base" }],
        hand: [{ card: "BT12-064", as: "tuwa" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tuwa").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-064");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT12-008"]);
  });

  it("rejects the alternate evolution from a level-3 card without Save text", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT12-064", as: "tuwa" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tuwa").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("raises its De-Digivolve ceiling from level 5 to level 6 with 2 sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-064", as: "tuwa", under: ["BT1-009", "BT1-010"] }] },
        1: { battleArea: [{ card: "BT1-025", as: "target", under: ["BT1-015"] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("tuwa"));
    expect(s.perm("target").topCard.cardId).toBe("BT1-015");
  });

  it("cannot choose a level 6 target with only 1 source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-064", as: "tuwa", under: ["BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-025", as: "target", under: ["BT1-015"] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("tuwa"));
    expect(s.perm("target").topCard.cardId).toBe("BT1-025");
  });

  it("Saves itself, then places another Save Digimon in exact order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-064", as: "tuwa" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-060", as: "peer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("tuwa").instanceId;
    const peerId = s.inst("peer").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("tuwa").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId, peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([]);
  });

  it("declining optional Save still performs the mandatory Then placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-064", as: "tuwa" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-060", as: "peer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("tuwa").instanceId;
    const peerId = s.inst("peer").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("tuwa").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
  });

  it("grants Blocker only to a Save-text host on its controller's turn", async () => {
    const own = setupEngine({ 0: { battleArea: [{ card: "BT12-063", as: "host", under: ["BT12-064"] }] } });
    await own.ready();
    expect(observe(own.engine).hasKeyword(own.perm("host"), "Blocker")).toBe(true);

    const off = setupEngine({ 0: { battleArea: [{ card: "BT12-063", as: "host", under: ["BT12-064"] }] } });
    off.state.turnSeat = 1;
    await off.ready();
    expect(observe(off.engine).hasKeyword(off.perm("host"), "Blocker")).toBe(false);

    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-064"] }] } });
    await plain.ready();
    expect(observe(plain.engine).hasKeyword(plain.perm("host"), "Blocker")).toBe(false);
  });
});
