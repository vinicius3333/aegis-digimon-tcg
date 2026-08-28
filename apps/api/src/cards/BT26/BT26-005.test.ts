import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { Action } from "@aegis/shared";
import { compiled } from "./BT26-005.js";
import "../index.js";

describe("BT26-005 Pinamon", () => {
  it("compiles the inherited deletion play with the exact face-down Tamer cost", () => {
    const action = compiled.effects[0]!.actions[0]! as Extract<Action, { kind: "PlayWithoutCost" }>;
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(action).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true });
    expect(action.cost).toMatchObject({ kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 });
    expect(action.target).toMatchObject({
      count: 1,
      filter: {
        controller: "mine",
        kind: ["Digimon", "Tamer"],
        playCostLte: 5,
        nameOrTrait: [
          { tokens: ["Avian"], match: "trait" },
          { tokens: ["DATA SQUAD"], match: "trait" },
        ],
      },
    });
  });

  it("plays an Avian card as well as a DATA SQUAD card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-065", as: "host", under: [{ card: "BT26-005" }] },
            { card: "BT26-091", as: "tamer", under: [{ card: "BT1-010", as: "cost", faceUp: false }] },
          ],
          trash: [{ card: "BT1-013", as: "avian" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-013"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("avian").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("trashes the bottom face-down Tamer card and plays the eligible Avian card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [{ card: "BT26-005", as: "pinamon" }] },
            { card: "BT26-091", as: "tamer", under: [{ card: "BT26-039", as: "cost", faceUp: false }] },
          ],
          trash: [{ card: "BT26-072", as: "avian" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("tamer").stack.length === 0);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT26-072")).toBe(true);
  });

  it("Q6958 may play the eligible card that was just trashed from under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [{ card: "BT26-005" }] },
            { card: "BT26-091", as: "tamer", under: [{ card: "BT26-072", as: "costAndTarget", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("costAndTarget").instanceId),
    );

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costAndTarget").instanceId)).toBe(
      false,
    );
  });

  it("accepts a play-cost-5 DATA SQUAD Tamer while rejecting over-cost and unrelated cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [{ card: "BT26-005" }] },
            { card: "BT26-091", as: "costTamer", under: [{ card: "BT1-010", as: "cost", faceUp: false }] },
          ],
          trash: [
            { card: "AD1-021", as: "eligibleTamer" },
            { card: "BT26-044", as: "overCost" },
            { card: "BT1-089", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligibleTamer").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("eligibleTamer").instanceId,
      ),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-021")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("overCost").instanceId, s.inst("unrelated").instanceId]),
    );
  });

  it("may decline without trashing the Tamer-stack card or playing from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [{ card: "BT26-005" }] },
            { card: "BT26-091", as: "tamer", under: [{ card: "BT26-039", as: "cost", faceUp: false }] },
          ],
          trash: [{ card: "BT26-072", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009"));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });
});
