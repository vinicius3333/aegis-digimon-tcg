import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-062.js";
import "./index.js";

describe("BT20-062 Candlemon", () => {
  it("has Retaliation as its main keyword", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("inherits an optional hand-trash cost to delete one opposing level 4 or lower Digimon", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        },
      ],
    });
  });

  it("publishes its stats and Retaliation deletes the Digimon that wins battle", async () => {
    expect(getCardDefinition("BT20-062")).toMatchObject({ level: 3, playCost: 3, dp: 1000 });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-062", as: "candlemon" }] },
      1: { battleArea: [{ card: "BT20-069", as: "winner", suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("candlemon"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("candlemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
  });

  it("when inherited, pays one hand card to delete level 4 while preserving level 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-069", under: ["BT20-062"], as: "host" }],
          hand: [{ card: "BT20-047", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-066", as: "level4" },
            { card: "BT20-071", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("level4").permanentId);
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-071"]);
  });

  it("may decline the inherited hand cost and deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-069", under: ["BT20-062"], as: "host" }],
          hand: [{ card: "BT20-047", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT20-066", as: "level4" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-066"]);
  });
});
