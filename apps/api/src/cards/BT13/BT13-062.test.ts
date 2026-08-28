import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT13-062.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-062 Chuumon", () => {
  it("charges the hand trash cost and plays inherited Chuumon suspended", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: false,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ match: "name", tokens: ["Sukamon", "Etemon"] }],
              },
              count: 1,
            },
          },
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        expect.objectContaining({
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          suspended: true,
          optional: true,
          condition: expect.objectContaining({ kind: "selfHasNameContaining", names: ["Sukamon", "Etemon"] }),
          target: expect.objectContaining({
            count: 1,
            filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Chuumon"] }] },
          }),
        }),
      ],
    });
  });

  it("trashes a Sukamon from hand and returns one from trash when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-062", as: "chuu" }, "BT11-040"], trash: ["BT11-040"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-062"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-062")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-040")).toBe(true);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT11-040")).toHaveLength(1);
  });

  it("plays exact Chuumon but not near-name ChuuChuumon from an inherited deletion", async () => {
    const exact = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "sukamon", under: ["BT13-062"] }],
          trash: ["BT3-061"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await exact.ready();
    await advance(exact.engine).verb.deletePermanent([exact.perm("sukamon").permanentId]);
    await settle(() => exact.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT3-061"));
    expect(exact.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT3-061")).toBe(true);

    const near = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "sukamon", under: ["BT13-062"] }],
          trash: ["BT12-060"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await near.ready();
    await advance(near.engine).verb.deletePermanent([near.perm("sukamon").permanentId]);
    expect(near.state.players[0]!.battleArea).toHaveLength(0);
    expect(near.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-060")).toBe(false);
    expect(near.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });
});
