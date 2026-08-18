import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-083.js";
import "./BT4-086.js";
import "./BT4-087.js";
import "../BT5/BT5-071.js";

describe("BT4 Anubismon and Cerberusmon historical deck gauntlet", () => {
  it("revives one Rush attacker, converts a chosen Cerberusmon into memory, and attacks twice", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-079", as: "levelFiveBase" },
            { card: "BT4-083", as: "firstCerberusmon" },
            { card: "BT4-083", as: "secondCerberusmon" },
          ],
          hand: [
            { card: "BT4-087", as: "anubismon" },
            { card: "BT4-086", as: "werewolfMode" },
          ],
          trash: [{ card: "BT5-071", as: "revivedRookie" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("revivedRookie").instanceId);
    const firstCerberusmonId = s.perm("firstCerberusmon").permanentId;
    const secondCerberusmonId = s.perm("secondCerberusmon").permanentId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("levelFiveBase").permanentId,
        instanceId: s.inst("anubismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const rookie = s.state.players[0]!.battleArea.find(
        ({ topCard }) => topCard?.instanceId === s.inst("revivedRookie").instanceId,
      );
      return rookie !== undefined && observe(s.engine).hasKeyword(rookie, "Rush");
    });
    expect(s.state.memory).toBe(7);

    preferred.splice(0, preferred.length, firstCerberusmonId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("werewolfMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === firstCerberusmonId) &&
      s.state.memory === 7 &&
      s.state.pendingDecision === undefined
    );
    const werewolfMode = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("werewolfMode").instanceId,
    );
    expect(werewolfMode).toBeDefined();

    const costRequest = s.decisions.find(({ req }) => {
      if (req.kind !== "chooseTargets") return false;
      const candidates = req.options?.candidateInstanceIds ?? [];
      return candidates.includes(firstCerberusmonId) && candidates.includes(secondCerberusmonId);
    })?.req;
    expect(costRequest).toBeDefined();
    expect(new Set(costRequest!.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([firstCerberusmonId, secondCerberusmonId, werewolfMode!.permanentId]),
    );
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === secondCerberusmonId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT4-083")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    const rookie = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("revivedRookie").instanceId,
    );
    expect(rookie).toBeDefined();
    await settle(() => observe(s.engine).hasKeyword(werewolfMode!, "Rush"));
    expect(observe(s.engine).hasKeyword(rookie!, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(werewolfMode!, "Rush")).toBe(true);

    for (const attacker of [rookie!, werewolfMode!]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    }

    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
