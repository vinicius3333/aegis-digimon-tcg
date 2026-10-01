import { describe, expect, it } from "vitest";
import { EffectTiming, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "../BT19/BT19-034.js";
import "./BT12-085.js";
import "./BT12-110.js";

describe("BT12-110 Seventh Full Cluster", () => {
  it("publishes trash, main, and security effects in declarative IR", () => {
    const compiled = getCompiledCard("BT12-110");
    expect(compiled?.effects.map(({ trigger }) => trigger)).toEqual(["YourTurn", "Main", "Security"]);
  });

  it("registers its printed Security activation", () => {
    const module = getEffectModule("BT12-110");
    const source = { instanceId: "source-110", cardId: "BT12-110", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("activates from trash when Beelzemon (X Antibody) digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-085", as: "beelzemon-x" }],
          trash: [{ card: "BT12-110", as: "cluster" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("beelzemon-x").permanentId,
    });

    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-110")).toBe(false);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT12-110")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });

  it("deletes the opposing Digimon with the lowest level from Main", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT12-110", as: "cluster" }], battleArea: [{ card: "BT12-085", as: "purpleSource" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cluster").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });

  it("activates the same lowest-level deletion from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT12-110", as: "cluster", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("cluster"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });
});

const DECK = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];
const OPPONENT_BOARD = [
  { card: "BT1-009", as: "lowest" },
  { card: "BT1-020", as: "higher" },
];

function cardIdsIn(zone: Iterable<{ cardId: string }>): string[] {
  return Array.from(zone, ({ cardId }) => cardId);
}

function opponentBoard(s: EngineSetup): string[] {
  return s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId ?? "");
}

async function digivolve(s: EngineSetup, base: string, into: string): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(base).permanentId,
      instanceId: s.inst(into).instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm(base).topCard?.instanceId === s.inst(into).instanceId);
  await settle();
}

function beelzemonIntoXAntibody(
  seat0: { trash?: string[]; hand?: string[]; under?: string[] },
  options: SetupEngineOptions = {},
): EngineSetup {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: "BT2-111", as: "beelzemon", under: seat0.under }],
        hand: [{ card: "BT12-085", as: "beelzemon-x" }, ...(seat0.hand ?? [])],
        trash: seat0.trash,
        deck: [...DECK],
        security: 3,
      },
      1: { battleArea: [...OPPONENT_BOARD], deck: [...DECK], security: 3 },
    },
    { autoAcceptOptional: true, autoSelectCards: true, ...options },
  );
}

describe("BT12-110 Seventh Full Cluster — KB Q&A rulings", () => {
  it("activates from the trash on your turn when your Digimon digivolves into [Beelzemon (X Antibody)] (Q2246)", async () => {
    const s = beelzemonIntoXAntibody({ trash: ["BT12-110"] });
    s.state.memory = 3;
    await s.ready();

    await digivolve(s, "beelzemon", "beelzemon-x");

    expect(cardIdsIn(s.state.players[0]!.trash)).not.toContain("BT12-110");
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT12-110");
    expect(opponentBoard(s)).toEqual(["BT1-020"]);

    const nearMiss = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-085", as: "skullmeramon" }],
          hand: [{ card: "BT3-089", as: "boltmon" }],
          trash: ["BT12-110"],
          deck: [...DECK],
        },
        1: { battleArea: [...OPPONENT_BOARD] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nearMiss.state.memory = 3;
    await nearMiss.ready();

    await digivolve(nearMiss, "skullmeramon", "boltmon");

    expect(cardIdsIn(nearMiss.state.players[0]!.trash)).toContain("BT12-110");
    expect(opponentBoard(nearMiss)).toEqual(["BT1-009", "BT1-020"]);
  });

  it("pays no memory cost when the [Trash] effect activates (Q2247)", async () => {
    const s = beelzemonIntoXAntibody({ trash: ["BT12-110"] });
    s.state.memory = 3;
    await s.ready();

    await digivolve(s, "beelzemon", "beelzemon-x");

    expect(opponentBoard(s)).toEqual(["BT1-020"]);
    expect(s.state.memory).toBe(2);
  });

  it("does not trigger 'when you use an Option card' effects from the [Trash] activation (Q2248)", async () => {
    const preferredTargets: string[] = [];
    const s = beelzemonIntoXAntibody(
      { trash: ["BT12-110"], hand: ["BT12-110"], under: ["BT19-034"] },
      { preferInstanceIds: preferredTargets },
    );
    preferredTargets.push(s.perm("higher").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    await digivolve(s, "beelzemon", "beelzemon-x");

    expect(opponentBoard(s)).toEqual(["BT1-020"]);
    expect(s.perm("higher").currentDP).toBe(6000);

    const handCopy = s.state.players[0]!.hand.find(({ cardId }) => cardId === "BT12-110")!;
    s.putOnBoard(1, "BT1-009");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: handCopy.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === handCopy.instanceId));
    await settle();

    expect(s.perm("higher").currentDP).toBe(4000);
  });

  it("activates only while in the trash, not from the hand (Q5528)", async () => {
    const s = beelzemonIntoXAntibody({ hand: ["BT12-110"] });
    s.state.memory = 3;
    await s.ready();

    await digivolve(s, "beelzemon", "beelzemon-x");

    expect(cardIdsIn(s.state.players[0]!.hand)).toContain("BT12-110");
    expect(cardIdsIn(s.state.players[0]!.deck)).not.toContain("BT12-110");
    expect(opponentBoard(s)).toEqual(["BT1-009", "BT1-020"]);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("lets the player order the [Trash] effect and the [When Digivolving] effect of [Beelzemon (X Antibody)] (Q5529)", async () => {
    const tenCardTrash = ["BT12-110", ...Array.from({ length: 9 }, () => "BT1-009")];

    const clusterFirst = beelzemonIntoXAntibody({ trash: tenCardTrash }, { preferTriggerKeys: ["BT12-110"] });
    clusterFirst.state.memory = 3;
    await clusterFirst.ready();
    await digivolve(clusterFirst, "beelzemon", "beelzemon-x");

    const offered = clusterFirst.decisions.find(({ req }) => req.kind === "orderTriggers")?.req.options?.triggerCardIds;
    expect(offered).toEqual(expect.arrayContaining(["BT12-085", "BT12-110"]));
    expect(opponentBoard(clusterFirst)).toEqual(["BT1-020"]);
    expect(clusterFirst.state.players[1]!.security).toHaveLength(3);

    const beelzemonFirst = beelzemonIntoXAntibody({ trash: tenCardTrash }, { preferTriggerKeys: ["BT12-085"] });
    beelzemonFirst.state.memory = 3;
    await beelzemonFirst.ready();
    await digivolve(beelzemonFirst, "beelzemon", "beelzemon-x");

    expect(opponentBoard(beelzemonFirst)).toEqual(["BT1-020"]);
    expect(beelzemonFirst.state.players[1]!.security).toHaveLength(2);
  });
});
