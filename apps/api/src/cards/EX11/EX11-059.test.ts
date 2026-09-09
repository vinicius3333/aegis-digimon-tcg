import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-059.js";
import "./EX11-023.js";

describe("EX11-059 Reina Oumi", () => {
  it("preserves the printed dual-color NSo Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-059")).toMatchObject({
      nameEn: "Reina Oumi",
      colors: ["Yellow", "Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["NSo", "LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "ifThisEffectActed" },
      });
    }
  });

  it("ignores a public deletion of a Digimon without the NSo trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-059", as: "reina" },
            { card: "BT1-009", as: "plain", suspended: true },
            { card: "EX8-033", as: "fieldMaterial" },
          ],
          hand: [{ card: "EX12-032", as: "dnaTarget" }],
          trash: [{ card: "EX8-013", as: "trashMaterial" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("plain").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ topCard }) => topCard.cardId !== "BT1-009"));
    expect(s.perm("reina").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("dnaTarget").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashMaterial").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes an NSo card, draws, and gains memory at the public start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-059", as: "reina" }],
          hand: [{ card: "EX8-008", as: "nsoCost" }],
          deck: ["AD1-001", "AD1-002", "AD1-003"],
        },
        1: { deck: ["AD1-004", "AD1-005", "AD1-006"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX8-008")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "AD1-001")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("resolves the same trash, draw, and memory sequence on public On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-059", as: "reina" },
            { card: "EX8-008", as: "nsoCost" },
          ],
          deck: ["AD1-001", "AD1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reina").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX8-008"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "AD1-001")).toBe(true);
    assertNoLoudGap(s);
  });

  it("DNA digivolves from a public own NSo deletion using field and trash materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-059", as: "reina" },
            { card: "EX8-013", as: "deletedNso", dp: 1000, suspended: true },
            { card: "EX8-033", as: "fieldMaterial", dp: 3000 },
          ],
          hand: [{ card: "EX12-032", as: "dnaTarget" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], deck: ["AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("deletedNso").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reina").isSuspended);
    expect(s.perm("reina").isSuspended).toBe(true);
    const dnaStack = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "EX12-032")!.stack;
    expect(dnaStack.map(({ cardId }) => cardId)).toEqual(["EX8-033", "EX8-013"]);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX12-032")).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX8-013")).toBe(false);
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-059", as: "reina", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-059"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-059")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publishes full IR with distinct field and trash NSo material pools", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["NSo"] }] },
        actions: [
          {
            kind: "DnaDigivolve",
            materials: { filter: { zone: "battleArea" }, count: 1 },
            looseMaterials: { filter: { zone: "trash" }, count: 1, from: ["trash"] },
            into: { zone: "hand", nameOrTrait: [{ tokens: ["NSo"] }] },
            cost: { kind: "suspend" },
          },
        ],
      },
    ]);
  });
});

it("does not bind a deleted NSo trash material after EX8-060 publicly plays it from trash (Q5913)", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX11-059", as: "reina" },
          { card: "EX8-060", as: "attacker" },
          { card: "EX8-010", as: "fieldMaterial" },
          { card: "EX8-008", as: "deletedNso", dp: 1000 },
        ],
        hand: [{ card: "EX12-032", as: "dnaTarget" }],
      },
      1: { security: ["BT1-013"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("deletedNso").permanentId);
  await s.ready();
  s.state.turnSeat = 0;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX8-008"));
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX8-008")).toBe(true);
  expect(s.perm("reina").isSuspended).toBe(false);
  expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX12-032")).toBe(true);
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX8-010")).toBe(true);
  assertNoLoudGap(s);
});
