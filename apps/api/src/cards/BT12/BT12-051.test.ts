import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-051.js";

describe("BT12-051 Yasyamon", () => {
  it("has the printed Save evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT12-051")).toContainEqual({
      level: 3,
      texts: ["Save"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("plays one named Tamer from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-051", as: "yasha" }], hand: [{ card: "BT12-091", as: "airu" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("yasha"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-091"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-091")).toBe(true);
  });

  it("plays the errata-corrected Ryoma Mogami during When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-051", as: "yasha" }], hand: [{ card: "BT12-097", as: "ryoma" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("yasha"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-097"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-097")).toBe(true);
  });

  it("does not play an unrelated Tamer from hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-051", as: "yasha" }], hand: [{ card: "BT12-094", as: "unrelated" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("yasha"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("unrelated").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("unrelated").instanceId),
    ).toBe(false);
  });

  it("Saves itself, then places another Save Digimon under its Tamer in exact order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-051", as: "yasha" },
            { card: "BT12-091", as: "airu" },
          ],
          trash: [{ card: "BT12-008", as: "saved" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("yasha").permanentId], "byEffect");
    const sourceId = s.inst("yasha").instanceId;
    const peerId = s.inst("saved").instanceId;
    await settle(() => s.perm("airu").stack.length === 2);
    expect(s.perm("airu").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId, peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([]);
  });

  it("declining optional Save still performs the mandatory Then placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-051", as: "yasha" },
            { card: "BT12-091", as: "airu" },
          ],
          trash: [{ card: "BT12-008", as: "peer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("yasha").instanceId;
    const peerId = s.inst("peer").instanceId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("yasha").permanentId], "byEffect");
    await settle(() => s.perm("airu").stack.length === 1);
    expect(s.perm("airu").stack.map(({ instanceId }) => instanceId)).toEqual([peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-091"]);
  });

  it("gives only a Save-text inherited host 2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-051"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT12-051"] }] } });
    await plain.ready();
    expect(plain.perm("host").currentDP).toBe(plain.perm("host").baseDP);
  });
});
