import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT13/BT13-019.js";
import "../BT4/BT4-097.js";
import "../BT9/BT9-103.js";
import "./BT10-086.js";
describe("BT10-086 Omnimon (X Antibody)", () => {
  it("bottom-decks all opposing Digimon tied for the highest level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-025", as: "base", under: ["BT6-111"] }],
          hand: [{ card: "BT10-086", as: "evolving" }],
        },
        1: { battleArea: ["BT6-111", "AD1-014", { card: "BT2-047", as: "lower" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("lower").permanentId);
  });

  it("reduces its alternate Omnimon digivolution cost by 2 when X Antibody is in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-025", as: "base", under: ["BT9-109"] }],
        hand: [{ card: "BT10-086", as: "evolving" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT9-109");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-086");

    expect(s.state.memory).toBe(2);
  });

  it("does not reduce its cost for an X Antibody-trait Digimon instead of the exact Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-025", as: "base", under: ["BT9-064"] }],
        hand: [{ card: "BT10-086", as: "evolving" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-086");

    expect(s.state.memory).toBe(0);
  });

  it("does not use an X Antibody-trait level 5 as the exact X Antibody cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-064", as: "traitOnly" }] }] },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("omnimon"));

    expect(s.perm("omnimon").stack.some(({ instanceId }) => instanceId === s.inst("traitOnly").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("reveals all opposing security, lets its controller trash the chosen card, then shuffles the rest face-down", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-109", as: "cost" }] }],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "target", suspended: true }],
          security: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "chosen" },
            { card: "BT1-003", as: "last" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.inst("chosen").instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("cost").instanceId);
  });
});

describe("BT10-086 Omnimon (X Antibody) — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  async function attackWithOmnimon(s: ReturnType<typeof setupEngine>): Promise<void> {
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omnimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId));
    await settle(() => !observe(s.engine).isAttacking());
  }

  it("places the rest of the revealed security back even while Kongou stops effects from adding security (Q1910)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-109", as: "cost" }] }],
        },
        1: {
          battleArea: ["BT2-056", { card: "BT1-028", as: "target", suspended: true }],
          hand: [{ card: "BT9-103", as: "kongou" }],
          security: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "chosen" },
            { card: "BT1-003", as: "last" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.inst("chosen").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kongou").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("kongou").instanceId));
    expect(advance(s.engine).ledgers.continuous.cannotAddSecurityFromEffect(0)).toBe(true);

    await attackWithOmnimon(s);

    const security = s.state.players[1]!.security;
    expect(security.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("first").instanceId, s.inst("last").instanceId].sort(),
    );
    expect(security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("first").instanceId);
  });

  it("lets the player who activated the effect choose which revealed security card is trashed (Q2009)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-109", as: "cost" }] }],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "target", suspended: true }],
          security: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "middle" },
            { card: "BT1-003", as: "chosen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.inst("chosen").instanceId);
    await s.ready();

    await attackWithOmnimon(s);

    const securityIds = [s.inst("first").instanceId, s.inst("middle").instanceId, s.inst("chosen").instanceId];
    const trashChoice = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" &&
        securityIds.every((instanceId) => req.options?.candidateInstanceIds?.includes(instanceId)),
    );
    expect(trashChoice?.seat).toBe(0);
    expect(s.decisions.some(({ seat, req }) => seat === 1 && req.kind === "selectCards")).toBe(false);
    const trashedSecurityIds = s.state.players[1]!.trash.map((card) => card.instanceId).filter((instanceId) =>
      securityIds.includes(instanceId),
    );
    expect(trashedSecurityIds).toEqual([s.inst("chosen").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("first").instanceId, s.inst("middle").instanceId].sort(),
    );
  });

  it("lets the opponent's Kari Kamiya activate when a revealed security card is trashed (Q2010)", async () => {
    async function omnimonDigivolves({ useRevealEffect }: { useRevealEffect: boolean }) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT4-097", as: "kari" }],
            security: ["BT1-009", "BT1-009", "BT1-009"],
            deck: [...FILLER],
          },
          1: {
            battleArea: [{ card: "BT3-016", as: "base" }],
            hand: [{ card: "BT10-086", as: "omnimon" }],
            deck: [...FILLER],
          },
        },
        {
          autoSelectCards: true,
          autoAcceptOptional: true,
          autoOrderTriggers: true,
          declinePrompts: useRevealEffect ? [] : ["By placing 1 [X Antibody] or level 6 card"],
        },
      );
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("omnimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT10-086");
      await settle();
      return s;
    }

    const revealed = await omnimonDigivolves({ useRevealEffect: true });
    expect(revealed.state.players[0]!.security).toHaveLength(2);
    expect(revealed.state.players[0]!.trash).toHaveLength(1);
    expect(revealed.perm("kari").isSuspended).toBe(true);
    expect(revealed.state.memory).toBe(2);

    const declined = await omnimonDigivolves({ useRevealEffect: false });
    expect(declined.state.players[0]!.security).toHaveLength(3);
    expect(declined.perm("kari").isSuspended).toBe(false);
    expect(declined.state.memory).toBe(3);
  });

  it("can be played by Gankoomon from a breeding-area Digimon's digivolution cards, unlike a plain [Omnimon] (Q2277)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-019", as: "gankoomon" }],
          breeding: {
            card: "BT13-007",
            as: "breedingTop",
            under: [
              { card: "BT5-086", as: "plainOmnimon" },
              { card: "BT10-086", as: "omnimonX" },
            ],
          },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const omnimonXId = s.inst("omnimonX").instanceId;
    preferred.push(omnimonXId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === omnimonXId));

    const playChoice = s.decisions.find(({ req }) => req.options?.candidateInstanceIds?.includes(omnimonXId));
    expect(playChoice?.seat).toBe(0);
    expect(playChoice?.req.options?.candidateInstanceIds).not.toContain(s.inst("plainOmnimon").instanceId);
    expect(s.perm("breedingTop").stack.map((card) => card.instanceId)).toEqual([s.inst("plainOmnimon").instanceId]);
  });
});
