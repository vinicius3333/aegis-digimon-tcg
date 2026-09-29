import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-025.js";
import "../index.js";
import "../BT17/BT17-017.js";
import "../BT17/BT17-097.js";
import "./BT16-027.js";
import "./BT16-028.js";

describe("BT16-025", () => {
  it("models Partition", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Partition" }] });
    expect(compiled.effects[3]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Partition" }] });
  });

  it("suspends opposing Digimon and prevents unsuspending during DNA digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: expect.objectContaining({ count: "all" }),
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { digivolutionCardsAtMost: 1 } },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "isDnaDigivolving" },
    });
  });

  it("DNA digivolves unsuspended, suspends opponents within the stack-count boundary, and locks unsuspend", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-018", as: "blueMaterial" },
          { card: "BT16-021", as: "greenMaterial" },
        ],
        hand: [{ card: "BT16-025", as: "paildramon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "noSources" },
          { card: "BT1-010", as: "oneSource", under: ["BT1-011"] },
          { card: "BT1-011", as: "twoSources", under: ["BT1-009", "BT1-010"] },
        ],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-025"));

    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("noSources"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oneSource"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("twoSources").permanentId]);
    expect(s.perm("twoSources").isSuspended).toBe(false);
  });

  it("Q2622 naturally suspends by stack-count on a non-DNA digivolution without the DNA-only lock", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-018", as: "base" }],
          hand: [{ card: "BT16-025", as: "paildramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "noSources" },
            { card: "BT1-010", as: "oneSource", under: ["BT1-011"] },
            { card: "BT1-011", as: "twoSources", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-025");

    expect(s.perm("noSources").isSuspended).toBe(true);
    expect(s.perm("oneSource").isSuspended).toBe(true);
    expect(s.perm("twoSources").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("noSources"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("oneSource"), "unsuspend")).toBe(false);
  });

  it("naturally suspends an opposing target when attacking once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-025", as: "paildramon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("naturally unsuspends itself when its once-per-turn attack effect cannot suspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-025", as: "paildramon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("paildramon").isSuspended === false);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("paildramon").isSuspended).toBe(false);
  });
});

const BLUE_LEVEL_4 = "BT2-024";
const GREEN_LEVEL_4 = "BT10-047";

function freeDigimonThreatenedByOpponent(options: {
  target: PermanentSpec;
  imperialdramonInHand: string;
  useDelay: boolean;
}): EngineSetup {
  const s = setupEngine(
    {
      0: {
        battleArea: [options.target, { card: "BT17-097", as: "delayOption" }],
        hand: [{ card: options.imperialdramonInHand, as: "imperialdramon" }],
      },
      1: { hand: [{ card: "BT17-017", as: "ancientGreymon" }] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      declinePrompts: options.useDelay ? [] : ["Prevent leaving the battle area"],
    },
  );
  s.state.turnSeat = 1;
  s.state.memory = 20;
  return s;
}

async function opponentPlaysDeletingAncientGreymon(s: EngineSetup): Promise<void> {
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ancientGreymon").instanceId })).toEqual({
    ok: true,
  });
  await drainMicrotasks();
}

function partitionPrompts(s: EngineSetup): EngineSetup["decisions"] {
  return s.decisions.filter(({ req }) => req.sourceCardId === "BT16-025" && req.promptText.includes("Partition"));
}

function battleAreaCardIds(s: EngineSetup): string[] {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "").sort();
}

describe("BT16-025 Paildramon — KB Q&A rulings", () => {
  it("negates Paildramon's own Partition once the Delay digivolves it first (Q2887)", async () => {
    const withDelay = freeDigimonThreatenedByOpponent({
      target: { card: "BT16-025", as: "paildramon", under: [BLUE_LEVEL_4, GREEN_LEVEL_4] },
      imperialdramonInHand: "BT16-028",
      useDelay: true,
    });
    await opponentPlaysDeletingAncientGreymon(withDelay);

    expect(withDelay.perm("paildramon").topCard?.cardId).toBe("BT16-028");
    expect(withDelay.perm("paildramon").stack.map((card) => card.cardId)).toEqual([
      BLUE_LEVEL_4,
      GREEN_LEVEL_4,
      "BT16-025",
    ]);
    expect(battleAreaCardIds(withDelay)).toEqual(["BT16-028"]);
    expect(partitionPrompts(withDelay)).toHaveLength(0);

    const withoutDelay = freeDigimonThreatenedByOpponent({
      target: { card: "BT16-025", as: "paildramon", under: [BLUE_LEVEL_4, GREEN_LEVEL_4] },
      imperialdramonInHand: "BT16-028",
      useDelay: false,
    });
    await opponentPlaysDeletingAncientGreymon(withoutDelay);

    expect(partitionPrompts(withoutDelay)).toHaveLength(1);
    expect(battleAreaCardIds(withoutDelay)).toEqual([GREEN_LEVEL_4, "BT17-097", BLUE_LEVEL_4].sort());
  });

  it("does not activate Paildramon's inherited Partition when the Delay digivolves it as the deleted top card (Q2888)", async () => {
    const s = freeDigimonThreatenedByOpponent({
      target: { card: "BT16-025", as: "paildramon", under: [BLUE_LEVEL_4, GREEN_LEVEL_4] },
      imperialdramonInHand: "BT16-028",
      useDelay: true,
    });
    s.give(1, Zone.Hand, { card: "BT17-017", as: "secondAncientGreymon" });
    await opponentPlaysDeletingAncientGreymon(s);

    expect(s.perm("paildramon").topCard?.cardId).toBe("BT16-028");
    expect(s.perm("paildramon").stack.map((card) => card.cardId)).toContain("BT16-025");
    expect(partitionPrompts(s)).toHaveLength(0);
    expect(battleAreaCardIds(s)).toEqual(["BT16-028"]);

    // Control: once Paildramon sits in the digivolution cards, its inherited Partition does trigger.
    s.state.memory = 20;
    expect(
      s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondAncientGreymon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    expect(partitionPrompts(s)).toHaveLength(1);
    expect(battleAreaCardIds(s)).toEqual([GREEN_LEVEL_4, BLUE_LEVEL_4].sort());
  });

  it("still activates the inherited Partition of a Digimon holding Paildramon after the Delay digivolves it (Q2889)", async () => {
    const s = freeDigimonThreatenedByOpponent({
      target: { card: "BT16-028", as: "dragonMode", under: [BLUE_LEVEL_4, GREEN_LEVEL_4, "BT16-025"] },
      imperialdramonInHand: "BT16-027",
      useDelay: true,
    });
    await opponentPlaysDeletingAncientGreymon(s);

    const eventIndex = (kind: string, cardId: string): number =>
      s.events.findIndex((event) => event.kind === kind && "cardId" in event && event.cardId === cardId);
    const delayDigivolve = eventIndex("digivolved", "BT16-027");
    expect(delayDigivolve).toBeGreaterThanOrEqual(0);
    expect(delayDigivolve).toBeLessThan(eventIndex("cardPlayed", BLUE_LEVEL_4));
    expect(delayDigivolve).toBeLessThan(eventIndex("cardPlayed", GREEN_LEVEL_4));
    expect(s.perm("dragonMode").topCard?.cardId).toBe("BT16-027");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT17-097"]);
    expect(partitionPrompts(s)).toHaveLength(1);
    expect(battleAreaCardIds(s)).toEqual([GREEN_LEVEL_4, "BT16-027", BLUE_LEVEL_4].sort());
  });
});
