import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/BT20-058.js";
import "../cards/BT20/index.js";
import "../cards/BT1/BT1-085.js";
import "../cards/BT9/BT9-029.js";
import "../cards/BT9/BT9-042.js";
import "../cards/BT9/BT9-054.js";
import "../cards/ST1/ST1-16.js";

const MATERIALS = ["raijinmon", "fujinmon", "suijinmon"] as const;

function board(autoAcceptOptional: boolean) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT20-058", under: ["BT9-042"], as: "otherHost" }],
        hand: [
          { card: "BT20-058", as: "raiden" },
          { card: "BT9-042", as: "raijinmon" },
          { card: "BT9-054", as: "fujinmon" },
          { card: "BT9-029", as: "suijinmon" },
          "BT1-010",
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT20-058", under: ["BT9-054"], as: "opponentHost" },
          { card: "BT1-085", as: "redTamer" },
        ],
        hand: [{ card: "ST1-16", as: "gaia" }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    {
      autoAcceptOptional,
      autoDeclineOptional: !autoAcceptOptional,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    },
  );
  return { preferred, s };
}

describe("fromOwnDigivolutionStack source selection", () => {
  it("publicly asks for one eligible source from the leaving host and plays the chosen nonfirst instance", async () => {
    const { preferred, s } = board(true);
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const materialIds = MATERIALS.map((alias) => s.inst(alias).instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("raiden").instanceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("raiden").instanceId),
    );
    expect(s.state.memory).toBe(4);
    const raidenTopId = s.perm("raiden").topCard.instanceId;
    preferred.push(s.inst("raijinmon").instanceId, raidenTopId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("raijinmon").instanceId),
    );

    const selection = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(s.inst("raijinmon").instanceId),
    );
    expect(selection?.req.kind).toBe("selectCards");
    if (selection?.req.kind !== "selectCards") throw new Error("source selection was not requested");
    expect(selection.req.options?.min).toBe(1);
    expect(selection.req.options?.max).toBe(1);
    expect(new Set(selection.req.options?.candidateInstanceIds)).toEqual(new Set(materialIds));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(s.inst("raijinmon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("raiden").instanceId,
        s.inst("suijinmon").instanceId,
        s.inst("fujinmon").instanceId,
      ]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("suijinmon").instanceId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(-5);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly declines the source play and trashes the leaving host and every source", async () => {
    const { preferred, s } = board(false);
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const materialIds = MATERIALS.map((alias) => s.inst(alias).instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("raiden").instanceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("raiden").instanceId),
    );
    preferred.push(s.perm("raiden").topCard.instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-058"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("raiden").instanceId, ...materialIds]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("raijinmon").instanceId)).toBe(
      false,
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
