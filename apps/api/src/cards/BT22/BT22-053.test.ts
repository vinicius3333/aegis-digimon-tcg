import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-053.js";
import "../index.js";

describe("BT22-053 Keramon", () => {
  it("reveals three cards and adds Arata plus an Unidentified or CS card", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Arata Sanada"], match: "name" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Unidentified", "CS"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });

  it("anchors inherited leave prevention to this Digimon and deletes another Diaboromon", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("reveals 3, adds Arata and a distinct Unidentified card, and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-053", as: "keramon" }],
          deck: ["BT1-009", "BT22-057", "BT22-091"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("keramon").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT22-057", "BT22-091"]));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]!.cardId).toBe("BT1-009");
  });

  it("uses the inherited replacement to delete another Diaboromon and retain its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-064", as: "host", under: ["BT22-053"] },
            { card: "BT5-084", as: "other-diaboromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-084")).toBe(true);
  });
});
