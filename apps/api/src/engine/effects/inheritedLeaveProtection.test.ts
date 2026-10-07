import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/BT21/BT21-022.js";
import "../../cards/BT25/BT25-027.js";
import "../../cards/BT9/BT9-024.js";
import "../../cards/EX5/EX5-015.js";
import "../../cards/EX5/EX5-018.js";
import "../../cards/P/P-072.js";
import "../../cards/P/P-073.js";
import "../../cards/P/P-214.js";
import "../../cards/ST24/ST24-06.js";
import "../../cards/ST1/ST1-16.js";
import "../../cards/BT20/BT20-027.js";

const CASES = [
  { source: "BT21-022", host: "RB1-010", battle: false },
  { source: "BT25-027", host: "BT11-028", battle: false },
  { source: "BT9-024", host: "BT2-078", battle: true },
  { source: "EX5-015", host: "BT2-078", battle: true },
  { source: "EX5-018", host: "BT2-078", battle: true },
  { source: "P-072", host: "BT4-019", battle: false },
  { source: "P-073", host: "BT2-078", battle: true },
  { source: "P-214", host: "BT2-030", battle: false },
  { source: "ST24-06", host: "BT2-041", battle: false },
];

describe("issue #5265 sweep: inherited self-protection", () => {
  it.each(
    CASES.flatMap((entry) => [
      { ...entry, targetHost: false, targetLabel: "a separate matching stack" },
      { ...entry, targetHost: true, targetLabel: "its inherited host" },
    ]),
  )("$source only protects its own host: targeting $targetLabel", async ({ source, host, battle, targetHost }) => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 30000 }],
          hand: [{ card: "ST1-16", as: "gaia" }],
        },
        1: {
          battleArea: [
            { card: host, as: "host", suspended: true, under: ["BT1-009", "BT1-010", source] },
            { card: host, as: "other", suspended: true },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-011", faceUp: false }] },
          ],
          trash: ["BT1-012", "BT1-013"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;
    const otherId = s.perm("other").permanentId;
    const originalSources = s.perm("host").stack.map(({ instanceId }) => instanceId);
    preferInstanceIds.push(s.perm(targetHost ? "host" : "other").topCard.instanceId);

    const result = s.engine.applyIntent(
      0,
      battle
        ? {
            type: "attack",
            attackerPermanentId: s.perm("attacker").permanentId,
            target: { kind: "permanent", permanentId: targetHost ? hostId : otherId },
          }
        : { type: "playCard", instanceId: s.inst("gaia").instanceId },
    );
    expect(result).toEqual({ ok: true });
    if (battle) await advance(s.engine).finishAttack();
    else await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 1);

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === otherId)).toBe(targetHost);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(targetHost ? 1 : 0);
    const paysFromTrash = source === "EX5-015" || source === "EX5-018";
    const paysFromTamer = source === "BT25-027" || source === "ST24-06";
    const trashesAllSources = source === "BT21-022";
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual(
      !targetHost || paysFromTrash || paysFromTamer ? originalSources : trashesAllSources ? [] : [originalSources[2]],
    );
    expect(s.perm("tamer").stack).toHaveLength(targetHost && paysFromTamer ? 0 : 1);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(
      targetHost && paysFromTrash ? ["BT1-012", "BT1-013"] : [],
    );
    const expectedTrash = !targetHost
      ? ["BT1-012", "BT1-013", host]
      : paysFromTrash
        ? []
        : paysFromTamer
          ? ["BT1-012", "BT1-013", "BT1-011"]
          : ["BT1-012", "BT1-013", "BT1-009", "BT1-010", ...(trashesAllSources ? [source] : [])];
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(expectedTrash);
  });
  it("preserves BT20-027's printed protection for another matching Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-009"], hand: [{ card: "ST1-16", as: "gaia" }] },
        1: {
          battleArea: [
            { card: "BT13-112", as: "host", under: ["BT20-027"] },
            { card: "BT20-027", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("other").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
  });
});
