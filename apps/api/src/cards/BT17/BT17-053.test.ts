import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-053.js";
import "./index.js";

describe("BT17-053 Keramon", () => {
  it("evolves into Infermon for free when an opposing level-5-or-higher Digimon is played or evolves", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toHaveLength(2);
    for (const action of effect!.actions) {
      expect(action).toMatchObject({
        event: expect.stringMatching(/^when/),
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, optional: true }],
      });
      expect(irNode(action).actions[0]).toMatchObject({
        condition: {
          kind: "triggerSubjectMatchesFilter",
          filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
        },
      });
    }
  });

  it("may play a Diaboromon Token after deletion when it had Unidentified", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon Token"],
          count: 1,
          payCost: false,
          optional: true,
          condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }] } },
        },
      ],
    });
  });

  it("free-digivolves into Infermon when the opponent plays a level-5 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-053", as: "keramon" }],
          hand: [{ card: "BT17-056", as: "infermon" }],
        },
        1: { battleArea: [{ card: "BT17-025", as: "playedLevel5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const infermonId = s.inst("infermon").instanceId;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("playedLevel5").permanentId,
    });
    await settle(() => s.perm("keramon").topCard?.instanceId === infermonId);

    expect(s.state.memory).toBe(0);
  });

  it("plays a Diaboromon Token when its Unidentified host is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-056", under: ["BT17-053"], as: "host" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-")),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });
});
