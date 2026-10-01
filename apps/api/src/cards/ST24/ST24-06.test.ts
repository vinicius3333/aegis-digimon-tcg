import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("ST24-06 RizeGreymon", () => {
  it("shares its once-per-turn DP reduction and exact two-card face-down Tamer cost across three triggers", () => {
    const compiled = registeredCompiledCards.get("ST24-06") ?? getCompiledCard("ST24-06")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "ModifyDP", amount: -5000 },
          {
            kind: "Modal",
            optional: true,
            cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 2 },
            options: [
              [
                {
                  kind: "PlayWithoutCost",
                  target: { filter: { kind: ["Digimon", "Tamer"], playCostLte: 5 } },
                },
              ],
              [
                {
                  kind: "UseOptionWithoutCost",
                  filter: { kind: ["Option"], playCostLte: 5 },
                },
              ],
            ],
          },
        ],
      });
    }
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
        },
      ],
    });
  });

  it("uses an eligible DATA SQUAD Option after paying two Tamer-stack cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST24-13",
              as: "firstTamer",
              under: [{ card: "BT1-001", as: "firstCost", faceUp: false }],
            },
            {
              card: "ST24-14",
              as: "secondTamer",
              under: [{ card: "BT1-002", as: "secondCost", faceUp: false }],
            },
          ],
          hand: [
            { card: "ST24-06", as: "rizeGreymon" },
            { card: "BT26-098", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const firstCostId = s.inst("firstCost").instanceId;
    const secondCostId = s.inst("secondCost").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizeGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstCostId, secondCostId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
  });

  it("prevents a legal host from leaving by paying one bottom face-down Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-07", as: "host", under: [{ card: "ST24-06" }] },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("under").instanceId)).toBe(true);
  });

  it("allows the host to leave when the inherited replacement cost cannot be paid", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST24-07", as: "host", under: [{ card: "ST24-06" }] }] } });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });
});

type TamerSpec = { card: string; under: { card: string; as: string; faceUp: false }[] };

function rizeGreymonBoard(tamers: TamerSpec[], hand: { card: string; as: string }[], preferOptionIndex = 0) {
  const s = setupEngine(
    {
      0: {
        battleArea: tamers,
        hand: [{ card: "ST24-06", as: "rizeGreymon" }, ...hand],
      },
      1: { battleArea: [{ card: "BT1-009", as: "zeroed", dp: 5000 }] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex,
      declinePrompts: ["Arts Digivolve"],
      declineDigiXros: true,
    },
  );
  s.state.memory = 10;
  return s;
}

async function playRizeGreymon(s: EngineSetup) {
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizeGreymon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() =>
    s.events.some(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST24-06" && event.timing === "OnPlay",
    ),
  );
  await settle(() => s.state.pendingDecision === undefined);
}

function eventIndex(s: EngineSetup, predicate: (event: EngineSetup["events"][number]) => boolean): number {
  return s.events.findIndex(predicate);
}

describe("ST24-06 RizeGreymon — KB Q&A rulings", () => {
  it("cannot pay the cost by trashing only 1 face-down card from under a Tamer (Q6211)", async () => {
    const s = rizeGreymonBoard(
      [{ card: "ST24-13", under: [{ card: "BT1-001", as: "onlyUnder", faceUp: false }] }],
      [{ card: "ST24-08", as: "lalamon" }],
    );

    await playRizeGreymon(s);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("lalamon").instanceId]);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("onlyUnder").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("pays the cost with 1 face-down card from under each of 2 Tamers (Q6212)", async () => {
    const s = rizeGreymonBoard(
      [
        { card: "ST24-13", under: [{ card: "BT1-001", as: "firstUnder", faceUp: false }] },
        { card: "ST24-14", under: [{ card: "BT1-002", as: "secondUnder", faceUp: false }] },
      ],
      [{ card: "ST24-08", as: "lalamon" }],
    );

    await playRizeGreymon(s);

    const lalamonId = s.inst("lalamon").instanceId;
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === lalamonId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("firstUnder").instanceId, s.inst("secondUnder").instanceId].sort(),
    );
  });

  it("deletes the 0 DP Digimon only after the played card enters the battle area (Q6213)", async () => {
    const s = rizeGreymonBoard(
      [
        {
          card: "ST24-13",
          under: [
            { card: "BT1-001", as: "firstUnder", faceUp: false },
            { card: "BT1-002", as: "secondUnder", faceUp: false },
          ],
        },
      ],
      [{ card: "ST24-08", as: "lalamon" }],
    );
    const lalamonId = s.inst("lalamon").instanceId;

    await playRizeGreymon(s);

    const lalamonPlayed = eventIndex(
      s,
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(lalamonId),
    );
    const zeroedDeleted = eventIndex(
      s,
      (event) =>
        event.kind === "cardsMoved" && (event.deletedPermanents ?? []).some(({ cardId }) => cardId === "BT1-009"),
    );
    expect(lalamonPlayed).toBeGreaterThanOrEqual(0);
    expect(zeroedDeleted).toBeGreaterThan(lalamonPlayed);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes the 0 DP Digimon only after the used Option card is trashed (Q6213)", async () => {
    const s = rizeGreymonBoard(
      [
        {
          // Green, so Queen of Thorns meets its color requirement.
          card: "ST24-14",
          under: [
            { card: "BT1-001", as: "firstUnder", faceUp: false },
            { card: "BT1-002", as: "secondUnder", faceUp: false },
          ],
        },
      ],
      [{ card: "BT26-098", as: "option" }],
      1,
    );
    const optionId = s.inst("option").instanceId;

    await playRizeGreymon(s);

    const optionTrashed = eventIndex(
      s,
      (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(optionId),
    );
    const zeroedDeleted = eventIndex(
      s,
      (event) =>
        event.kind === "cardsMoved" && (event.deletedPermanents ?? []).some(({ cardId }) => cardId === "BT1-009"),
    );
    expect(optionTrashed).toBeGreaterThanOrEqual(0);
    expect(zeroedDeleted).toBeGreaterThan(optionTrashed);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
