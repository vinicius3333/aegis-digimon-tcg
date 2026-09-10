import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-086.js";
import "../BT15/BT15-092.js";
import "../ST1/ST1-12.js";
import "./BT20-046.js";
import "./BT20-047.js";
import "./index.js";

describe("BT20-086 Altea", () => {
  it("matches the catalog and encodes every printed branch", () => {
    expect(getCardDefinition("BT20-086")).toMatchObject({
      cardId: "BT20-086",
      nameEn: "Altea",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      types: ["LIBERATOR"],
      effectText: expect.stringContaining("If you have 2 or less memory, set it to 3"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          controller: "opponent",
          op: "flipFaceUp",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
              },
              count: 1,
            },
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                playCostLte: 4,
                nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
              },
              count: 1,
              from: ["hand", "trash"],
            },
          },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isSecurity)).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("sets memory to 3 only at the printed <=2 boundary on a real turn", async () => {
    for (const memory of [2, 3, 4]) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT20-086", as: "altea" }], deck: ["BT1-010", "BT1-010", "BT1-010"] },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
      });
      s.state.memory = memory;
      await s.ready();
      const turn = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(memory <= 2 ? 3 : memory);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await turn;
    }
  });

  it("places an eligible Cyborg from hand or trash under a legal Machine host and flips the first face-down security", async () => {
    for (const zone of ["hand", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-086", as: "altea" },
              { card: "BT20-047", as: "host" },
            ],
            [zone]: [{ card: "BT20-046", as: "placed" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"], deck: ["BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const placedId = s.inst("placed").instanceId;
      await s.ready();
      const turn = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(placedId);
      expect(s.state.players[0]![zone].some((card) => card.instanceId === placedId)).toBe(false);
      expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await turn;
    }
  });

  it("accepts either printed trait branch and refuses wrong-trait, non-black, or over-cost cards", async () => {
    for (const candidate of ["BT20-046", "BT20-047"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-086", as: "altea" },
              { card: "BT20-047", as: "host" },
            ],
            hand: [{ card: candidate, as: "candidate" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const candidateId = s.inst("candidate").instanceId;
      await s.ready();
      const turn = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("host").stack.some((card) => card.instanceId === candidateId)).toBe(true);
      expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await turn;
    }

    for (const candidate of ["BT20-010", "BT1-068", "BT20-054"] as const) {
      const rejected = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-086", as: "altea" },
              { card: "BT20-047", as: "host" },
            ],
            hand: [{ card: candidate, as: "candidate" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const rejectedId = rejected.inst("candidate").instanceId;
      await rejected.ready();
      const rejectedTurn = rejected.engine.startTurnLoop();
      await advance(rejected.engine).waitForMainPhase(0);
      expect(rejected.perm("host").stack.some((card) => card.instanceId === rejectedId)).toBe(false);
      expect(rejected.state.players[0]!.hand.some((card) => card.instanceId === rejectedId)).toBe(true);
      expect(rejected.state.players[1]!.security[0]!.faceUp).toBe(false);
      expect(rejected.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await rejectedTurn;
    }
  });

  it("flips the first face-down security even when the top card is already face-up (Q4423)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-086", as: "altea" },
            { card: "BT20-047", as: "host" },
          ],
          hand: [{ card: "BT20-046", as: "placed" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("keeps a face-up card public through a check and resolves its Security effect (Q4424-Q4426)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-047", as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
        1: { security: [{ card: "ST1-12", as: "securityTai", faceUp: true }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", revealedCardId: "ST1-12", resolution: "effect" }),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST1-12")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("re-hides every face-up security card when a public effect shuffles the stack (Q4427)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "yellowSource" }],
          hand: [{ card: "BT15-092", as: "shuffler" }],
          security: [{ card: "BT1-010", faceUp: true }, { card: "BT1-010", faceUp: true }, "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.every((card) => card.faceUp !== true));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
  });
});
