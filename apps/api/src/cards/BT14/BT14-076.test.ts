import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-076.js";
import {
  drainMicrotasks,
  settle,
  setupEngine,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-076", () => {
  it("deletes the lowest-level own and opposing Digimon by trashing a hand card on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "Delete",
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
        target: { filter: { controller: "mine", superlative: "lowestLevel" } },
      },
      { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" } } },
    ]));
  it("plays an Agumon from trash and grants a Digimon Rush if Tai is present on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], bindResultAs: "playedAgumon" },
        {
          kind: "GainKeyword",
          target: { filter: { boundRef: "playedAgumon" } },
          keyword: { keyword: "Rush" },
          condition: { kind: "youHave" },
        },
      ],
    }));
  it("legally digivolves, trashes the hand cost, and deletes the lowest own and opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-010", as: "base" },
            { card: "BT14-080", as: "other" },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [
            { card: "BT14-076", as: "source" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [{ card: "ST1-03", as: "agumon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT14-069", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009") &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST1-03"),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-076")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Rush")).toBe(false);
  });
});

describe("BT14-076 SkullGreymon — KB Q&A rulings", () => {
  const digivolveIntoSkullGreymon = async (
    board: { ownOthers: PermanentSpec[]; opponent: PermanentSpec[] },
    optionalAnswer: "accept" | "decline",
  ) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-010", as: "greymon" }, ...board.ownOthers],
          hand: [
            { card: "BT14-076", as: "skullGreymon" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: board.opponent },
      },
      {
        autoSelectCards: true,
        ...(optionalAnswer === "accept" ? { autoAcceptOptional: true } : { autoDeclineOptional: true }),
      },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("skullGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    return s;
  };
  const trashIds = (s: EngineSetup, seat: 0 | 1) => s.state.players[seat]!.trash.map(({ instanceId }) => instanceId);

  it("deletes SkullGreymon itself when it is your only Digimon and you trash a hand card (Q2446)", async () => {
    const paid = await digivolveIntoSkullGreymon({ ownOthers: [], opponent: [] }, "accept");
    await settle(() => trashIds(paid, 0).includes(paid.inst("skullGreymon").instanceId));
    expect(trashIds(paid, 0)).toContain(paid.inst("handCost").instanceId);
    expect(paid.state.players[0]!.battleArea).toHaveLength(0);

    const declined = await digivolveIntoSkullGreymon({ ownOthers: [], opponent: [] }, "decline");
    await settle(() => declined.state.memory === 7);
    await drainMicrotasks();
    expect(declined.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("handCost").instanceId,
    );
    expect(declined.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT14-076"]);
  });

  it("can trash a hand card to delete your lowest-level Digimon even when the opponent has no Digimon (Q2447)", async () => {
    const s = await digivolveIntoSkullGreymon(
      { ownOthers: [{ card: "BT14-069", as: "gazimon" }], opponent: [] },
      "accept",
    );
    await settle(() => trashIds(s, 0).includes(s.inst("gazimon").instanceId));
    expect(trashIds(s, 0)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT14-076"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
