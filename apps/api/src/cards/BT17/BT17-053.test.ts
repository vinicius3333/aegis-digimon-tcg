import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
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
        1: { hand: [{ card: "BT17-055", as: "playedLevel5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const infermonId = s.inst("infermon").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("playedLevel5").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("keramon").topCard?.instanceId === infermonId);

    expect(s.state.memory).toBe(10);
  });

  it("does not evolve when the opponent plays a level-4 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-053", as: "keramon" }],
          hand: [{ card: "BT17-055", as: "infermon" }],
        },
        1: { hand: [{ card: "BT17-054", as: "playedLevel4" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const keramonId = s.perm("keramon").topCard!.instanceId;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("playedLevel4").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-054"));

    expect(s.perm("keramon").topCard?.instanceId).toBe(keramonId);
  });

  it("plays a Diaboromon Token when its Unidentified host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-054", under: ["BT17-053"], suspended: true, as: "host" }] },
        1: { battleArea: [{ card: "BT17-057", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-")),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });
});
