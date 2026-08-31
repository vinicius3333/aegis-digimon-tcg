import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-065.js";
import "./index.js";

describe("BT17-065 DexDorugamon", () => {
  it("digivolves the triggering Dorugamon from trash before preventing deletion", () => {
    const replacement = compiled.effects.find((entry) => entry.isFromTrash)?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Dorugamon"], match: "name" }] },
      },
      sourceFilter: { zone: "trash", controller: "mine" },
      leaveCause: "any",
      digivolveFromTrash: true,
      abortOnDecline: true,
    });
  });

  it("trashes one hand card, then branches to draw or play-cost deletion", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "not", condition: { kind: "anyOf" } },
    });
    expect(actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", playCostLte: 4 }, count: 1 },
      condition: { kind: "anyOf" },
    });
  });

  it("digivolves from trash to prevent Dorugamon's deletion, then trashes and deletes instead of drawing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-062", as: "dorugamon" }],
          trash: [{ card: "BT17-065", as: "dexDorugamon" }],
          hand: [{ card: "BT1-001", as: "discarded" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
        1: { battleArea: [{ card: "BT17-025", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dorugamonId = s.perm("dorugamon").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([dorugamonId], "byEffect")).toBe(0);
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    const protectedDigimon = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === dorugamonId);
    expect(protectedDigimon?.topCard.cardId).toBe("BT17-065");
    expect(protectedDigimon?.stack.some((card) => card.cardId === "BT7-062")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("allows Dorugamon's deletion when DexDorugamon is unavailable in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-062", as: "dorugamon" }] },
      1: { battleArea: [{ card: "BT17-025", as: "target" }] },
    });
    const dorugamonId = s.perm("dorugamon").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([dorugamonId], "byEffect")).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dorugamonId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("grants inherited Reboot to a legal level-5 host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-078", under: ["BT17-065"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").topCard.cardId).toBe("BT14-078");
    expect(s.perm("host").stack.some((card) => card.cardId === "BT17-065")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
