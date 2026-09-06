import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_025 } from "./BT25-025.js";
import "../index.js";
import "../BT19/BT19-065.js";
import "../BT11/BT11-107.js";

describe("BT25-025 Aegiochusmon: Blue", () => {
  it("de-digivolves one opposing Digimon and conditionally unsuspends yours", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_025.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Unsuspend",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      });
    }
  });

  it("only watches removal from your own security and preserves Blocker/Decode", () => {
    const inherited = BT25_025.effects?.find((entry) => entry.isInherited);
    const watcher = inherited?.actions?.[0] as { sourceFilter?: unknown } | undefined;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "mine" },
    });
    expect(BT25_025.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
        expect.objectContaining({ keywords: [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }] }),
      ]),
    );
  });

  it("uses Blocker through a public attack and redirects the battle without removing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-025", as: "blocker", under: ["BT25-033"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-025")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Decodes Aegiomon from its stack on non-battle removal and still leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-025", as: "source", under: [{ card: "BT25-033", as: "aegiomon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-033"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("aegiomon").instanceId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-025");
  });

  it("Decodes after a real opponent play effect deletes the source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-025", as: "source", under: [{ card: "BT25-033", as: "aegiomon" }] }],
        },
        1: { hand: [{ card: "BT25-019", as: "destroyer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("destroyer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-033"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT25-033");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-025");
  });

  it("does not Decode from battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-025", as: "source", under: [{ card: "BT25-033", as: "aegiomon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byBattle")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("aegiomon").instanceId);
  });

  it("may decline Decode and then trashes the source and its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-025", as: "source", under: [{ card: "BT25-033", as: "aegiomon" }] }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("aegiomon").instanceId);
  });

  it("unsuspends one Shaman when your security is removed, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "BT25-018", as: "host", under: [{ card: "BT25-025", as: "inherited" }] },
            { card: "BT25-053", as: "shaman", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => !s.perm("shaman").isSuspended);
    expect(s.perm("shaman").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("shaman").permanentId]);
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.perm("shaman").isSuspended).toBe(true);
  });

  it.each([3, 4])("applies the On Play security threshold at exactly %s cards", async (securityCount) => {
    const s = setupEngine(
      {
        0: {
          security: Array.from({ length: securityCount }, (_, i) => (i % 2 === 0 ? "BT1-001" : "BT1-002")),
          battleArea: [{ card: "BT1-016", as: "ally", suspended: true }],
          hand: [{ card: "BT25-025", as: "source" }],
        },
        1: { battleArea: [{ card: "BT25-026", as: "stacked", under: ["BT1-009", "BT1-016"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT25-025"));

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(s.perm("ally").isSuspended).toBe(securityCount > 3);
  });

  it("naturally de-digivolves and unsuspends on a legal When Digivolving stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-024", as: "base" },
            { card: "BT1-016", as: "ally", suspended: true },
          ],
          hand: [{ card: "BT25-025", as: "source" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT25-026", as: "stacked", under: ["BT1-016"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-025");

    expect(s.perm("base").topCard.cardId).toBe("BT25-025");
    expect(s.perm("stacked").topCard.cardId).toBe("BT1-016");
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("matches Rule Cyborg at runtime when a trait filter plays it from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-065", as: "machine" }],
          trash: [{ card: "BT25-025", as: "cyborg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("machine").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT25-025"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT25-025")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("cyborg").instanceId);
  });

  it("unsuspends a Shaman when a public attack removes security", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-013"],
          battleArea: [
            { card: "BT25-018", as: "host", under: [{ card: "BT25-025", as: "inherited" }] },
            { card: "BT25-053", as: "shaman", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("shaman").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("shaman").isSuspended).toBe(false);
  });

  it("does not react when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT25-018", as: "host", under: [{ card: "BT25-025", as: "inherited" }], suspended: true },
            { card: "BT25-053", as: "ownShaman", suspended: true },
          ],
        },
        1: {
          security: ["BT1-001"],
          battleArea: [{ card: "BT25-053", as: "shaman", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.trashFromSecurity(1, 1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("ownShaman").isSuspended).toBe(true);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => !s.perm("host").isSuspended || !s.perm("ownShaman").isSuspended);
    expect(s.perm("host").isSuspended && s.perm("ownShaman").isSuspended).toBe(false);
  });

  it("resolves the revealed Security effect before the inherited removal watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-018", as: "host", under: ["BT25-025"], suspended: true },
            { card: "BT25-053", as: "shaman", suspended: true },
            { card: "BT1-010", as: "nonShaman", suspended: true },
          ],
          security: [{ card: "BT11-107", as: "securityEffect" }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("shaman").isSuspended).toBe(true);

    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options?.candidateInstanceIds).toEqual([s.perm("host").permanentId, s.perm("shaman").permanentId]);
    expect(s.perm("nonShaman").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
