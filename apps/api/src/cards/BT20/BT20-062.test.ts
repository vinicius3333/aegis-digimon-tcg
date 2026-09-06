import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
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
          battleArea: [{ card: "BT20-069", under: ["BT20-062"], suspended: true, as: "host" }],
          hand: [{ card: "BT20-047", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-066", as: "level4" },
            { card: "BT20-071", as: "level5" },
            { card: "BT20-076", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const hostId = s.perm("host").permanentId;
    preferred.push(s.inst("cost").instanceId, s.perm("level4").permanentId, hostId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-066"),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-071", "BT20-076"]),
    );
  });

  it("publicly builds a Yaamon-Candlemon-Punkmon stack before the inherited deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-006", as: "yaamon" }],
          hand: [
            { card: "BT20-062", as: "candlemon" },
            { card: "BT20-069", as: "host" },
            { card: "BT20-047", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-066", as: "level4" },
            { card: "BT20-076", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("candlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT20-062");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT20-069");
    expect(s.perm("yaamon").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX7-006", "BT20-062"]));
  });

  it("may decline the inherited hand cost and deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-069", under: ["BT20-062"], suspended: true, as: "host" }],
          hand: [{ card: "BT20-047", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-066", as: "level4" },
            { card: "BT20-076", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
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
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-066", "BT20-076"]),
    );
  });
});
