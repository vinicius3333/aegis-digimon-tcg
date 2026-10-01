import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import "../BT4/BT4-105.js";
import "./BT6-044.js";

describe("BT6-044 Dynasmon", () => {
  it("reveals 6 before resolving the Recovery triggered by its security-trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "base" }],
          hand: [{ card: "BT6-044", as: "evolving" }],
          security: [{ card: "BT1-010", as: "trashedSecurity" }],
          deck: [
            { card: "BT1-095", as: "digivolveDraw" },
            { card: "BT2-020", as: "one" },
            { card: "BT2-017", as: "two" },
            "BT1-090",
            "BT1-091",
            "BT1-092",
            "BT1-093",
            { card: "BT1-094", as: "recovered" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.security.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(player.hand.some((card) => card.instanceId === s.inst("one").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("two").instanceId)).toBe(true);
    expect(player.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(player.trash).toHaveLength(5);
  });

  it("may add none of the eligible level 6 or lower Digimon after paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "base" }],
          hand: [{ card: "BT6-044", as: "evolving" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [
            { card: "BT1-095", as: "digivolveDraw" },
            { card: "BT2-020", as: "eligibleA" },
            { card: "BT2-017", as: "eligibleB" },
            "BT1-090",
            "BT1-091",
            "BT1-092",
            "BT1-093",
            "BT1-094",
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(JSON.parse(choice.payloadJson)).toMatchObject({ min: 0, max: 2 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("eligibleA").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligibleA").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligibleB").instanceId)).toBe(false);
  });
});

describe("BT6-044 Dynasmon — KB Q&A rulings", () => {
  const DECK_AFTER_DRAW = ["BT1-090", "BT1-091", "BT1-092", "BT1-093", "BT1-012", "BT1-013"];

  const setupDigivolve = (security: CardSpec[], opts: SetupEngineOptions = {}): EngineSetup => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "base" }],
          hand: [{ card: "BT6-044", as: "evolving" }],
          security,
          deck: [
            { card: "BT1-095", as: "digivolveDraw" },
            ...DECK_AFTER_DRAW,
            { card: "BT1-094", as: "recovered" },
            { card: "BT1-093", as: "spare" },
          ],
        },
      },
      opts,
    );
    s.state.memory = 4;
    return s;
  };

  const digivolveIntoDynasmon = (s: EngineSetup) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    });

  const handHas = (s: EngineSetup, alias: string) =>
    s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);

  const securityIds = (s: EngineSetup, seat: 0 | 1) => s.state.players[seat]!.security.map((card) => card.instanceId);

  it("lets the player decline trashing the top security card, leaving security and deck untouched (Q1428)", async () => {
    const s = setupDigivolve(["BT1-010", "BT1-011", "BT1-012", "BT1-013"]);
    const securityBefore = securityIds(s, 0);

    expect(digivolveIntoDynasmon(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const offer = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req).toMatchObject({ kind: "optional", sourceCardId: "BT6-044" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: offer.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && handHas(s, "digivolveDraw"));
    await drainMicrotasks();

    expect(securityIds(s, 0)).toEqual(securityBefore);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(DECK_AFTER_DRAW.length + 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("digivolveDraw").instanceId]);

    const accepted = setupDigivolve(["BT1-010", "BT1-011", "BT1-012", "BT1-013"], {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    const acceptedTopSecurity = securityIds(accepted, 0)[0];
    expect(digivolveIntoDynasmon(accepted)).toEqual({ ok: true });
    await settle(() => accepted.state.players[0]!.trash.some((card) => card.instanceId === acceptedTopSecurity));
    expect(securityIds(accepted, 0)).not.toContain(acceptedTopSecurity);
  });

  it("cannot activate its [When Digivolving] effect with an empty security stack (Q1429)", async () => {
    const s = setupDigivolve([], { autoAcceptOptional: true, autoSelectCards: true });

    expect(digivolveIntoDynasmon(s)).toEqual({ ok: true });
    await settle(() => handHas(s, "digivolveDraw"));
    await drainMicrotasks();

    expect(s.decisions.some(({ req }) => req.kind === "optional" || req.kind === "selectCards")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("digivolveDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(DECK_AFTER_DRAW.length + 2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);

    const oneSecurity = setupDigivolve([{ card: "BT1-010", as: "lastSecurity" }], {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    expect(digivolveIntoDynasmon(oneSecurity)).toEqual({ ok: true });
    await settle(() => securityIds(oneSecurity, 0).includes(oneSecurity.inst("recovered").instanceId));
    expect(oneSecurity.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(
      oneSecurity.state.players[0]!.trash.some(
        (card) => card.instanceId === oneSecurity.inst("lastSecurity").instanceId,
      ),
    ).toBe(true);
  });

  it("triggers its [All Turns] Recovery when its own [When Digivolving] cost leaves 3 security cards (Q1430)", async () => {
    const s = setupDigivolve(["BT1-010", "BT1-011", "BT1-012", "BT1-013"], {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    const [trashedSecurity, ...remainingSecurity] = securityIds(s, 0);

    expect(digivolveIntoDynasmon(s)).toEqual({ ok: true });
    await settle(() => securityIds(s, 0).includes(s.inst("recovered").instanceId));

    expect(securityIds(s, 0)).toEqual([s.inst("recovered").instanceId, ...remainingSecurity]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === trashedSecurity)).toBe(true);

    const fourLeft = setupDigivolve(["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-009"], {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    const [fourLeftTrashed, ...fourLeftRemaining] = securityIds(fourLeft, 0);
    expect(digivolveIntoDynasmon(fourLeft)).toEqual({ ok: true });
    await settle(() => fourLeft.state.players[0]!.trash.some((card) => card.instanceId === fourLeftTrashed));
    await drainMicrotasks();
    expect(securityIds(fourLeft, 0)).toEqual(fourLeftRemaining);
  });

  it("resolves copies one at a time, skipping any copy once security is back to 4, and that copy can activate later in the turn (Q1431)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-019", as: "firstAttacker" },
            { card: "BT1-019", as: "secondAttacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT6-044", as: "dynasmonA" },
            { card: "BT6-044", as: "dynasmonB" },
          ],
          security: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
          deck: [
            { card: "BT1-013", as: "firstRecovery" },
            { card: "BT1-013", as: "secondRecovery" },
            { card: "BT1-013", as: "unused" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const [firstChecked, ...untouchedSecurity] = securityIds(s, 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => securityIds(s, 1).includes(s.inst("firstRecovery").instanceId));
    await drainMicrotasks();

    expect(securityIds(s, 1)).toEqual([s.inst("firstRecovery").instanceId, ...untouchedSecurity]);
    expect(securityIds(s, 1)).not.toContain(firstChecked);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("secondRecovery").instanceId,
      s.inst("unused").instanceId,
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => securityIds(s, 1).includes(s.inst("secondRecovery").instanceId));
    await drainMicrotasks();

    expect(securityIds(s, 1)).toHaveLength(4);
    expect(securityIds(s, 1)[0]).toBe(s.inst("secondRecovery").instanceId);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("unused").instanceId]);

    const recoveringCopies = s.events.flatMap((event, index) => {
      if (event.kind !== "securityRecovered") return [];
      const resolved = s.events.slice(index).find((later) => later.kind === "effectResolved");
      return resolved?.kind === "effectResolved" ? [resolved.sourcePermanentId] : [];
    });
    expect(recoveringCopies).toHaveLength(2);
    expect(new Set(recoveringCopies)).toEqual(
      new Set([s.perm("dynasmonA").permanentId, s.perm("dynasmonB").permanentId]),
    );
  });

  it("lets a checked card's [Security] effect finish before its [All Turns] effect checks the security count (Q1432)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT6-044", as: "dynasmon" }],
          security: [{ card: "BT4-105", as: "tacticalRetreat" }, "BT1-012", "BT1-012", "BT1-012"],
          deck: [
            { card: "BT1-013", as: "securityEffectRecovery" },
            { card: "BT1-013", as: "dynasmonRecovery" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const untouchedSecurity = securityIds(s, 1).slice(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tacticalRetreat").instanceId),
    );
    await drainMicrotasks();

    expect(securityIds(s, 1)).toEqual([s.inst("securityEffectRecovery").instanceId, ...untouchedSecurity]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("dynasmonRecovery").instanceId]);

    const noSecurityEffect = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT6-044", as: "dynasmon" }],
          security: [{ card: "BT1-013", as: "plainChecked" }, "BT1-012", "BT1-012", "BT1-012"],
          deck: [{ card: "BT1-013", as: "dynasmonRecovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const plainUntouched = securityIds(noSecurityEffect, 1).slice(1);
    expect(
      noSecurityEffect.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: noSecurityEffect.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => securityIds(noSecurityEffect, 1).includes(noSecurityEffect.inst("dynasmonRecovery").instanceId));
    expect(securityIds(noSecurityEffect, 1)).toEqual([
      noSecurityEffect.inst("dynasmonRecovery").instanceId,
      ...plainUntouched,
    ]);
  });
});
