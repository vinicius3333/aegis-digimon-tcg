import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-076.js";
import "../index.js";

describe("BT26-076 Crowmon", () => {
  it("models the delete-plus-Tamer cost and both once-per-turn reactions", () => {
    expect(getCardDefinition("BT26-076")).toMatchObject({
      nameEn: "Crowmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Mysterious Bird", "DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "Delete",
          target: {
            filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        }),
        expect.objectContaining({
          kind: "CostGatedBlock",
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
          optional: true,
          abortOnDecline: true,
          actions: [expect.objectContaining({ kind: "Trash", chooser: "opponent" })],
        }),
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenHandTrashed",
          fireCondition: { kind: "triggerHandTrashedSeat", seat: "opponent" },
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true },
        }),
      ],
    });
  });

  it("distinguishes the exact-name, exact-trait, and substring-trait references it prints", () => {
    // "[Ravemon]" is a bracket-only card reference (rules 2-3-1-2): exact name, so
    // "Ravemon: Burst Mode" is not a legal reactive digivolution target.
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(irNode(irNode(watcher.actions[0]!).actions[0]).into).toMatchObject({
      filter: {
        nameOrTrait: [
          { tokens: ["Ravemon"], match: "nameExact" },
          { tokens: ["DATA SQUAD"], match: "trait" },
        ],
      },
    });
    // "[Avian] or [Bird] in any of its traits" is the substring form (rules 2-3-2-4);
    // "the [DATA SQUAD] trait" stays an exact trait identity (rules 2-3-2-3).
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              playCostLte: 5,
              nameOrTrait: [
                { tokens: ["Avian"], match: "traitContains" },
                { tokens: ["Bird"], match: "traitContains" },
                { tokens: ["DATA SQUAD"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
  });

  it("digivolves for 3 from an off-color level-4 DATA SQUAD Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-039", as: "greenDataSquadBase" }],
        hand: [{ card: "BT26-076", as: "crowmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenDataSquadBase").permanentId,
        instanceId: s.inst("crowmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenDataSquadBase").topCard.cardId === "BT26-076");

    expect(s.state.memory).toBe(0);
  });

  it("publicly deletes a level 4 opponent Digimon and trashes a face-down Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-076", as: "crowmon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], hand: [{ card: "BT1-011", as: "discarded" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crowmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-011");
  });

  it("reacts to the opponent's hand being trashed and pays the reduced trash digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-076", as: "crowmon" }],
          trash: [{ card: "EX4-058", as: "ravemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });

    expect(s.perm("crowmon").topCard.cardId).toBe("EX4-058");
    expect(s.state.memory).toBe(3);
  });

  it("shares one once-per-turn budget across repeated hand-trash events", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-076", as: "crowmon" }],
          trash: [
            { card: "EX4-058", as: "firstEvolution" },
            { card: "EX4-058", as: "secondEvolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstEvolution").instanceId);
    s.state.memory = 4;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });
    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });

    expect(s.perm("crowmon").topCard.cardId).toBe("EX4-058");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondEvolution").instanceId,
    );
    expect(s.state.memory).toBe(2);
  });

  it("naturally reacts when its own effect trashes a card from under a Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-076", as: "crowmon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
          trash: [
            { card: "EX4-058", as: "ravemon" },
            { card: "BT26-082", as: "secondRavemon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          hand: [{ card: "BT1-011", as: "discarded" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crowmon"));
    await settle(() => s.perm("crowmon").topCard.cardId === "EX4-058");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-082");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-011");
  });

  it("does not react to an opponent-hand trash during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-076", as: "crowmon" }],
          trash: [{ card: "EX4-058", as: "ravemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });

    expect(s.perm("crowmon").topCard.cardId).toBe("BT26-076");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX4-058");
  });

  it("Q7104 keeps the play-cost ceiling across every inherited trait branch", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-076"] }],
          trash: [
            { card: "ST24-13", as: "validDataSquadTamer" },
            { card: "ST18-09", as: "invalidCost6Avian" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("validDataSquadTamer").instanceId);
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "ST24-13"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("ST24-13");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("ST18-09");
  });

  it("may decline the inherited On Deletion play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-076"] }],
          trash: [{ card: "ST24-13", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });
});
