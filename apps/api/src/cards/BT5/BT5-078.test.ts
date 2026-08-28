import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-078.js";
import "../BT10/BT10-073.js";

describe("BT5-078 Jokermon", () => {
  it("plays a purple level 3 from trash without activating its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-078", as: "joker", under: ["BT5-074"] }],
          trash: [{ card: "BT10-073", as: "rookie" }],
          deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const rookieId = s.inst("rookie").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("joker").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.memory).toBe(0);
  });

  it("does not play a purple Digimon at another level", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-078", as: "joker" }], trash: [{ card: "BT5-075", as: "wrongLevel" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("joker").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongLevel").instanceId)).toBe(true);
  });

  it("plays only an own purple level 3 from a mixed trash pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-078", as: "joker" }],
          trash: [
            { card: "BT10-073", as: "ownCandidate" },
            { card: "BT1-009", as: "wrongColor" },
          ],
        },
        1: { trash: [{ card: "BT10-073", as: "opponentCandidate" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("joker").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("ownCandidate").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("ownCandidate").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongColor").instanceId]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentCandidate").instanceId,
    ]);
  });

  it("may decline when an eligible purple level 3 is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-078", as: "joker" }],
          trash: [{ card: "BT10-073", as: "candidate" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("joker").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("candidate").instanceId)).toBe(
      true,
    );
  });
});
