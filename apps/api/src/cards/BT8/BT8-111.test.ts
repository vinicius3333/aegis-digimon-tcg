import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-111.js";
import "./BT8-111.js";

describe("BT8-111 Creepymon", () => {
  it("keeps the opponent-count mill, threshold, and per-ten attack scaling in IR", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "TrashTopDeck",
            amount: 2,
            trackCount: "creepymonMilled",
            scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Purple"],
                levelComparison: { op: "lte", value: 5 },
              },
              count: 1,
            },
            condition: { kind: "namedCountAtLeast", countSource: "creepymonMilled", count: 4 },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "opponent",
            amount: 3,
            scaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "mine" } },
          },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "forTheTurn",
            scaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "mine" } },
          },
        ],
      },
    ]);
  });

  it("mills 2 per opposing Digimon and may play a purple level-5-or-lower Digimon after milling at least 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT8-111", as: "evolving" }],
          deck: ["BT1-009", { card: "BT8-080", as: "played" }, "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: ["BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-111"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});

const PURPLE_ROOKIE = "BT10-071";
const PURPLE_ULTIMATE = "BT10-079";
const OTHER_PURPLE_ULTIMATE = "BT12-079";
const FILLER = "BT1-009";

async function attackWithCreepymon(trashSize: number) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT8-111", as: "creepymon" }],
        trash: Array.from({ length: trashSize }, () => FILLER),
        deck: [FILLER, FILLER],
        security: [FILLER],
      },
      1: { deck: Array.from({ length: 10 }, () => FILLER), security: [FILLER, FILLER] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("creepymon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-111"));
  return s;
}

describe("BT8-111 Creepymon — KB Q&A rulings", () => {
  it("plays only 1 purple level 5 or lower Digimon even after trashing 8 cards (Q1792)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT8-111", as: "evolving" }],
          deck: [
            { card: PURPLE_ROOKIE, as: "rookie" },
            FILLER,
            { card: PURPLE_ULTIMATE, as: "ultimate" },
            FILLER,
            { card: OTHER_PURPLE_ULTIMATE, as: "otherUltimate" },
            FILLER,
            FILLER,
            FILLER,
            FILLER,
            FILLER,
          ],
        },
        1: { battleArea: ["BT1-015", "BT1-016", "BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-111"));

    const candidateIds = [s.inst("rookie"), s.inst("ultimate"), s.inst("otherUltimate")].map((card) => card.instanceId);
    const playedCandidates = s.state.players[0]!.battleArea.filter((permanent) =>
      candidateIds.includes(permanent.topCard?.instanceId ?? ""),
    );
    const playSelection = s.decisions.find(
      (decision) =>
        decision.seat === 0 &&
        decision.req.kind === "selectCards" &&
        candidateIds.some((id) => decision.req.options?.candidateInstanceIds?.includes(id)),
    );

    expect(playedCandidates).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(7);
    expect(playSelection?.req.options?.max).toBe(1);
  });

  it("trashes 6 opponent cards and gains +6000 DP with 20 cards in trash (Q1793)", async () => {
    const twenty = await attackWithCreepymon(20);
    expect(twenty.state.players[1]!.deck).toHaveLength(4);
    expect(twenty.perm("creepymon").currentDP).toBe(17000);

    const nineteen = await attackWithCreepymon(19);
    expect(nineteen.state.players[1]!.deck).toHaveLength(7);
    expect(nineteen.perm("creepymon").currentDP).toBe(14000);
  });
});
