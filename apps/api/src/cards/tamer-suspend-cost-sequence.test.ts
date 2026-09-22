import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Action, CompiledCard } from "@aegis/shared";
import { setupEngine, settle } from "../engine/testkit/harness.js";
import "./BT9/BT9-092.js";
import "./EX2/EX2-057.js";
import "./EX2/EX2-063.js";
import "./EX2/EX2-065.js";
import "./index.js";

describe("Tamer suspend costs gate their complete triggered sequences", () => {
  it("gives every printed self-suspending Tamer a structured self-suspend mechanism", () => {
    const effects = JSON.parse(
      readFileSync(new URL("../../../../packages/shared/src/effects/effects.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
    const cards = JSON.parse(
      readFileSync(new URL("../../../../packages/shared/src/cards/data/cards.json", import.meta.url), "utf8"),
    ) as Array<{ cardId: string; kinds?: string[]; effectText?: string }>;

    function costSuspendsSelf(value: unknown): boolean {
      if (value === null || typeof value !== "object") return false;
      const cost = value as {
        kind?: string;
        raw?: string;
        target?: { isSelf?: boolean; filter?: { isSelfRef?: boolean } };
        costs?: unknown[];
      };
      if (cost.kind === "compound") return (cost.costs ?? []).some(costSuspendsSelf);
      return (
        cost.kind === "suspend" &&
        (cost.target === undefined ||
          cost.target.isSelf === true ||
          cost.target.filter?.isSelfRef === true ||
          /this Tamer/iu.test(cost.raw ?? ""))
      );
    }

    function hasStructuredSelfSuspend(value: unknown): boolean {
      if (value === null || typeof value !== "object") return false;
      const node = value as Record<string, unknown>;
      if (node.restriction === "suspendThisTamer") return true;
      if (
        node.kind === "Suspend" &&
        typeof node.target === "object" &&
        node.target !== null &&
        ((node.target as { isSelf?: boolean }).isSelf === true ||
          (node.target as { filter?: { isSelfRef?: boolean } }).filter?.isSelfRef === true)
      ) {
        return true;
      }
      if (costSuspendsSelf(node.cost) || costSuspendsSelf(node.additionalCost)) return true;
      if (Array.isArray(node.additionalCosts) && node.additionalCosts.some(costSuspendsSelf)) return true;
      return Object.values(node).some((nested) =>
        Array.isArray(nested) ? nested.some(hasStructuredSelfSuspend) : hasStructuredSelfSuspend(nested),
      );
    }

    const missing = cards
      .filter(
        ({ kinds, effectText }) =>
          kinds?.includes("Tamer") === true && /suspend(?:ing)? this (?:Tamer|Digimon)/iu.test(effectText ?? ""),
      )
      .filter(({ cardId }) => !hasStructuredSelfSuspend(effects[cardId]))
      .map(({ cardId }) => cardId);

    expect(missing).toEqual([]);
  });

  it("encodes triggered self-suspension as a SubTrigger cost, never as a payload action", () => {
    const catalog = JSON.parse(
      readFileSync(new URL("../../../../packages/shared/src/effects/effects.json", import.meta.url), "utf8"),
    ) as Record<string, CompiledCard>;
    const cardCatalog = JSON.parse(
      readFileSync(new URL("../../../../packages/shared/src/cards/data/cards.json", import.meta.url), "utf8"),
    ) as Array<{ cardId: string; kinds?: string[] }>;
    const tamerIds = new Set(cardCatalog.filter(({ kinds }) => kinds?.includes("Tamer")).map(({ cardId }) => cardId));
    const offenders: string[] = [];

    function visitAction(cardId: string, action: Action): void {
      if (action.kind === "SubTrigger") {
        const hasSelfSuspendPayload = action.actions.some(
          (nested) =>
            nested.kind === "Suspend" &&
            (nested.target.isSelf === true || nested.target.filter.isSelfRef === true),
        );
        if (hasSelfSuspendPayload) offenders.push(`${cardId}:${action.event}`);
      }
      if ("actions" in action && Array.isArray(action.actions)) {
        for (const nested of action.actions) visitAction(cardId, nested);
      }
    }

    for (const [cardId, compiled] of Object.entries(catalog)) {
      if (!tamerIds.has(cardId)) continue;
      for (const effect of compiled.effects ?? []) {
        for (const action of effect.actions) visitAction(cardId, action);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("BT9-092 does not draw or gain memory when Cool Boy is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-092", as: "coolBoy", suspended: true },
            { card: "BT5-007", as: "agumon" },
          ],
          hand: [{ card: "BT9-008", as: "agumonX" }],
          deck: [
            { card: "BT1-001", as: "normalDigivolutionDraw" },
            { card: "BT1-002", as: "untouched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("agumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.instanceId === s.inst("agumonX").instanceId);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalDigivolutionDraw").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("untouched").instanceId)).toBe(false);
  });

  it("EX2-065 neither mills nor digivolves Beelzemon when Ai & Mako is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako", suspended: true },
          ],
          deck: [{ card: "BT1-001", as: "topDeck" }],
          trash: [{ card: "EX2-074", as: "blastMode" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("beelzemon").topCard.cardId).toBe("EX2-044");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastMode").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("EX2-057 trashes no opposing sources when Kenta is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-057", as: "kenta", suspended: true }],
          hand: [{ card: "EX2-018", as: "marineAngemon" }],
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "first", under: ["EX2-003", "EX2-004"] },
            { card: "EX2-021", as: "second", under: ["EX2-003", "EX2-004"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("marineAngemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("marineAngemon").instanceId,
      ),
    );
    await settle();

    expect(s.perm("first").stack).toHaveLength(2);
    expect(s.perm("second").stack).toHaveLength(2);
  });

  it("EX2-063 neither draws nor trashes from hand when Kazu is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-031", as: "machine" },
            { card: "EX2-063", as: "kazu", suspended: true },
          ],
          hand: [{ card: "BT1-001", as: "handCard" }],
          deck: [{ card: "BT1-002", as: "topDeck" }],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("handCard").instanceId]);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("topDeck").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
