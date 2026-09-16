import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter/matching/definition.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-040.js";

async function raiseWormmonToOwnMain(
  s: EngineSetup,
  { memory = 5, evolveMemory = 5 }: { memory?: number; evolveMemory?: number } = {},
): Promise<void> {
  const loop = s.engine.startTurnLoop();
  loops.set(s, loop);
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = evolveMemory;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("wormmon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("egg").topCard?.cardId === "BT23-040");
  expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT23-002"]);
  expect(s.perm("egg").inBreeding).toBe(true);

  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  advance(s.engine).endMainPhaseIfOpen(1);

  await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
  s.state.memory = memory;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
    ok: true,
  });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.perm("egg").inBreeding).toBe(false);
}

const loops = new Map<EngineSetup, Promise<unknown>>();

async function closeTurn(s: EngineSetup): Promise<void> {
  const loop = loops.get(s);
  if (loop === undefined) return;
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  loops.delete(s);
}

type NameOrTraitRef = Parameters<typeof matchNameOrTrait>[1];

const cardIds = (cards: { map: (fn: (card: { cardId: string }) => string) => string[] }): string[] =>
  cards.map((card) => card.cardId);

describe("BT23-040 Wormmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-040")).toMatchObject({
      cardId: "BT23-040",
      nameEn: "Wormmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 1 }],
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Larva", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the printed Start of Main clause with exact names and a mandatory shedding cost", () => {
    const action = (
      compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as never as {
        actions: Record<string, unknown>[];
      }
    ).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Hudiemon"], match: "nameExact" }],
      },
      from: ["hand", "trash"],
      payCost: true,
      reduceCost: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        targetIsPermanent: true,
        shedOwnCards: true,
        target: {
          filter: {
            controller: "mine",
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["Erika Mishima"], match: "nameExact" }],
          },
          count: 1,
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
    const exactErika: NameOrTraitRef = { tokens: ["Erika Mishima"], match: "nameExact" };
    const substringErika: NameOrTraitRef = { tokens: ["Erika Mishima"], match: "name" };
    const impostor = { nameEn: "Erika Mishima & Ryuji Mishima" };
    expect(matchNameOrTrait({ nameEn: "Erika Mishima" }, exactErika)).toBe(true);
    expect(matchNameOrTrait(impostor, exactErika)).toBe(false);
    expect(matchNameOrTrait(impostor, substringErika)).toBe(true);
    const exactHudiemon: NameOrTraitRef = { tokens: ["Hudiemon"], match: "nameExact" };
    expect(matchNameOrTrait({ nameEn: "Hudiemon" }, exactHudiemon)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Hudiemon X" }, exactHudiemon)).toBe(false);
  });

  it("places the battle-area Erika at the bottom of a real stack, trashes her own cards, and pays the printed cost less 2", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-084", as: "erika", under: [{ card: "BT1-009", as: "underErika" }] }],
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const eggInstanceId = s.perm("egg").topCard!.instanceId;
    const erikaInstanceId = s.inst("erika").instanceId;
    const erikaPermanentId = s.perm("erika").permanentId;
    const underErikaId = s.inst("underErika").instanceId;
    const hudiemonId = s.inst("hudiemon").instanceId;
    const wormmonId = s.inst("wormmon").instanceId;

    await raiseWormmonToOwnMain(s);

    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([erikaInstanceId, eggInstanceId, wormmonId]);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT23-084", "BT23-002", "BT23-040"]);
    expect(s.perm("egg").topCard?.instanceId).toBe(hudiemonId);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === erikaPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([underErikaId]);
    expect(s.state.memory).toBe(3);
    expect(cardIds(s.state.players[0]!.hand)).toEqual(["BT1-010", "BT1-011", "BT1-012"]);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("lets the controller take the alternate CS requirement instead, for one memory less", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-084", as: "erika" }],
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await raiseWormmonToOwnMain(s);

    expect(s.perm("egg").topCard?.cardId).toBe("BT23-101");
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("digivolves into a Hudiemon in the trash when the hand holds none", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-084", as: "erika" }],
          hand: [{ card: "BT23-040", as: "wormmon" }],
          trash: [{ card: "BT23-101", as: "trashHudiemon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await raiseWormmonToOwnMain(s);
    const trashHudiemonId = s.inst("trashHudiemon").instanceId;

    expect(s.perm("egg").topCard?.instanceId).toBe(trashHudiemonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(trashHudiemonId);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("cannot pay with an Erika Mishima in the hand or the trash (Q5302)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-084", as: "handErika" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          trash: [{ card: "BT23-084", as: "trashErika" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await raiseWormmonToOwnMain(s);
    const decisionsBefore = s.decisions.length;

    expect(s.perm("egg").topCard?.cardId).toBe("BT23-040");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handErika").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hudiemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashErika").instanceId]);
    expect(s.decisions.slice(decisionsBefore).filter((d) => d.req.kind === "optional")).toEqual([]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("cannot pay with another Hudie CS Tamer or with the opponent's Erika", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-081", as: "chitose" }],
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT23-084", as: "opponentErika" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await raiseWormmonToOwnMain(s);
    const chitosePermanentId = s.perm("chitose").permanentId;
    const opponentErikaPermanentId = s.perm("opponentErika").permanentId;

    expect(s.perm("egg").topCard?.cardId).toBe("BT23-040");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === chitosePermanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentErikaPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hudiemon").instanceId);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("keeps Erika and her stack on the field when the controller declines", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-084", as: "erika", under: [{ card: "BT1-009", as: "underErika" }] }],
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await raiseWormmonToOwnMain(s);
    const erikaPermanentId = s.perm("erika").permanentId;

    expect(s.perm("egg").topCard?.cardId).toBe("BT23-040");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT23-002"]);
    const erika = s.state.players[0]!.battleArea.find((p) => p.permanentId === erikaPermanentId);
    expect(erika?.stack.map((card) => card.instanceId)).toEqual([s.inst("underErika").instanceId]);
    expect(cardIds(s.state.players[0]!.trash)).toEqual([]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hudiemon").instanceId);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("does not pay the cost when no Hudiemon is available to digivolve into", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-084", as: "erika" }],
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-041", as: "kabuterimon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await raiseWormmonToOwnMain(s);
    const erikaPermanentId = s.perm("erika").permanentId;

    expect(s.perm("egg").topCard?.cardId).toBe("BT23-040");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === erikaPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kabuterimon").instanceId);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("never fires on the opponent's Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-002", as: "egg" },
          battleArea: [{ card: "BT23-084", as: "erika" }],
          hand: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await raiseWormmonToOwnMain(s);
    const erikaPermanentId = s.perm("erika").permanentId;
    const startOfMainTriggers = (): number =>
      s.events.filter((event) => event.kind === "effectTriggered" && event.effectKey === "BT23-040/ir-1-0").length;

    expect(s.state.turnSeat).toBe(0);
    expect(startOfMainTriggers()).toBe(1);
    expect(s.perm("egg").topCard?.cardId).toBe("BT23-040");

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(
      s.events.some((event) => event.kind === "phaseChanged" && event.phase === Phase.Main && event.turnSeat === 1),
    ).toBe(true);
    expect(startOfMainTriggers()).toBe(1);
    expect(s.perm("egg").topCard?.cardId).toBe("BT23-040");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === erikaPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hudiemon").instanceId);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(startOfMainTriggers()).toBe(2);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("inherits +1000 DP for every own Hudie Digimon and loses it when the source leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-101", as: "carrier", under: ["BT23-040"] },
            { card: "BT23-017", as: "hudiePeer" },
            { card: "BT1-009", as: "plainPeer" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT23-048", as: "opponentHudie" },
            { card: "BT1-014", as: "bigBlocker", dp: 14000, suspended: true },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(s.perm("carrier").currentDP).toBe(8000);
    expect(s.perm("hudiePeer").currentDP).toBe(2000);
    expect(s.perm("plainPeer").currentDP).toBe(3000);
    expect(s.perm("opponentHudie").currentDP).toBe(1000);

    const carrierPermanentId = s.perm("carrier").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrierPermanentId,
        target: { kind: "permanent", permanentId: s.perm("bigBlocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === carrierPermanentId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === carrierPermanentId)).toBe(false);
    expect(s.perm("hudiePeer").currentDP).toBe(1000);
    expect(s.perm("plainPeer").currentDP).toBe(3000);
    expect(s.perm("opponentHudie").currentDP).toBe(1000);
    assertNoLoudGap(s);
    await closeTurn(s);
  });

  it("inherits the all-Hudie continuous DP bonus", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("digivolves for 0 from a level-2 CS Digi-Egg in breeding and rejects a non-CS egg", async () => {
    const legal = setupEngine({
      0: { breeding: { card: "BT23-002", as: "egg" }, hand: [{ card: "BT23-040", as: "wormmon" }] },
    });
    legal.state.memory = 5;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("egg").permanentId,
        instanceId: legal.inst("wormmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("egg").topCard?.cardId === "BT23-040");
    expect(legal.state.memory).toBe(5);

    const illegal = setupEngine({
      0: { breeding: { card: "BT1-001", as: "egg" }, hand: [{ card: "BT23-040", as: "wormmon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("egg").permanentId,
        instanceId: illegal.inst("wormmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
