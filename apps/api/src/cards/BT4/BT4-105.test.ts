import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-035.js";
import "../BT10/BT10-039.js";
import "../BT10/BT10-041.js";
import "../EX1/EX1-030.js";
import "../EX1/EX1-031.js";
import "../EX2/EX2-007.js";
import "./BT4-097.js";
import "./BT4-105.js";

describe("BT4-105 Tactical Retreat!", () => {
  it("places the chosen Digimon face down on security and trashes its whole stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT4-044",
              as: "target",
              under: [
                { card: "BT4-003", as: "bottom" },
                { card: "BT4-011", as: "topSource" },
              ],
            },
          ],
          security: ["BT4-033"],
          hand: [{ card: "BT4-105", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard.instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    const placed = s.state.players[0]!.security.find((card) => card.instanceId === targetInstanceId);
    expect(placed).toBeDefined();
    expect(placed?.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("topSource").instanceId]),
    );
  });

  it("recovers the top deck card when checked in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT4-105", as: "securityOption", faceUp: true }],
        deck: [{ card: "BT4-033", as: "recovered" }],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("routes Mother D-Reaper to its owner's Digi-Egg deck instead of security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          breeding: { card: "BT4-003" },
          eggDeck: ["BT1-001"],
          security: ["BT4-033"],
          hand: [{ card: "BT4-105", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["BT1-001", "EX2-007"]);
    expect(s.state.players[0]!.eggDeck.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).not.toContain("EX2-007");
  });

  it("removes a chosen token instead of adding it to security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "TOKEN-Diaboromon", as: "token" }],
          breeding: { card: "BT4-003" },
          security: ["BT4-033"],
          hand: [{ card: "BT4-105", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).not.toContain("TOKEN-Diaboromon");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("TOKEN-Diaboromon");
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).not.toContain("TOKEN-Diaboromon");
  });
});

type RetreatTarget = "mother" | "token" | "plain";

function setupRetreatWithWatchers(chosen: RetreatTarget) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX1-031", as: "angewomonHost", under: ["EX1-030"] },
          { card: "BT4-097", as: "kari" },
          { card: "EX2-007", as: "mother" },
          { card: "TOKEN-Diaboromon", as: "token" },
          { card: "BT1-009", as: "plain" },
        ],
        eggDeck: ["BT1-001", "BT1-002"],
        security: ["BT4-033"],
        hand: [{ card: "BT4-105", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponentDigimon", dp: 5000 }] },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm(chosen).topCard!.instanceId);
  s.state.memory = 3;
  return s;
}

async function playRetreatOn(s: ReturnType<typeof setupRetreatWithWatchers>, chosen: RetreatTarget) {
  const chosenPermanentId = s.perm(chosen).permanentId;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === chosenPermanentId) &&
      s.state.pendingDecision === undefined,
  );
}

describe("BT4-105 Tactical Retreat! — KB Q&A rulings", () => {
  it("does not activate [On Deletion] of the Digimon placed on security (Q1269)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-035", as: "leomon" },
            { card: "EX1-031", as: "yellowSource" },
          ],
          security: ["BT4-033"],
          hand: [{ card: "BT4-105", as: "option" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    const leomonId = s.perm("leomon").topCard!.instanceId;
    preferred.push(leomonId);
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.security[0]?.instanceId === leomonId && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).not.toContain(leomonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(leomonId);
    expect(s.state.memory).toBe(2);
  });

  it("sends Mother D-Reaper to the Digi-Egg deck and fires no card-added-to-security effect (Q1270)", async () => {
    const control = setupRetreatWithWatchers("plain");
    await playRetreatOn(control, "plain");
    expect(control.state.players[0]!.security[0]!.instanceId).toBe(control.inst("plain").instanceId);
    expect(control.perm("opponentDigimon").currentDP).toBe(3000);

    const s = setupRetreatWithWatchers("mother");
    const motherId = s.inst("mother").instanceId;
    await playRetreatOn(s, "mother");
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(motherId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.eggDeck.at(-1)?.instanceId).toBe(motherId);
    expect(s.perm("opponentDigimon").currentDP).toBe(5000);
  });

  it("removes a token from the game and fires no card-added-to-security effect (Q1271)", async () => {
    const control = setupRetreatWithWatchers("plain");
    await playRetreatOn(control, "plain");
    expect(control.state.players[0]!.security).toHaveLength(2);
    expect(control.perm("opponentDigimon").currentDP).toBe(3000);

    const s = setupRetreatWithWatchers("token");
    const tokenId = s.inst("token").instanceId;
    await playRetreatOn(s, "token");
    const player = s.state.players[0]!;
    expect(player.battleArea.map((permanent) => permanent.topCard?.instanceId)).not.toContain(tokenId);
    const everyZone = [...player.security, ...player.trash, ...player.eggDeck, ...player.hand, ...player.deck];
    expect(everyZone.map((card) => card.instanceId)).not.toContain(tokenId);
    expect(player.security).toHaveLength(1);
    expect(s.perm("opponentDigimon").currentDP).toBe(5000);
  });

  it("fires no card-removed-from-security effect when Mother D-Reaper or a token is diverted (Q1272)", async () => {
    for (const chosen of ["mother", "token"] as const) {
      const s = setupRetreatWithWatchers(chosen);
      await playRetreatOn(s, chosen);
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT4-033"]);
      expect(s.perm("kari").isSuspended).toBe(false);
      expect(s.state.memory).toBe(2);
    }
  });

  it("places Tactical Retreat on top of security after Maid Mode used it on Maid Mode itself (Q1962)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "BT4-105", as: "retreat" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const maidId = s.inst("maid").instanceId;
    const retreatId = s.inst("retreat").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: maidId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === retreatId));
    expect(s.state.players[0]!.security.slice(0, 2).map((card) => card.instanceId)).toEqual([retreatId, maidId]);
    expect(s.state.players[0]!.security.slice(0, 2).every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(retreatId);
  });

  it("puts a Digi-Egg Mother D-Reaper face down at the bottom of the Digi-Egg deck, not on security (Q3284)", async () => {
    const s = setupRetreatWithWatchers("mother");
    const motherId = s.inst("mother").instanceId;
    await playRetreatOn(s, "mother");
    const eggDeck = s.state.players[0]!.eggDeck;
    expect(eggDeck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002", "EX2-007"]);
    expect(eggDeck.at(-1)?.instanceId).toBe(motherId);
    expect(eggDeck.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(motherId);
  });
});
