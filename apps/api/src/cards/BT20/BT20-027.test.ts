import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT20-027.js";
import "./index.js";
import "../BT5/BT5-086.js";
import "../BT20/BT20-045.js";
import "../ST2/ST2-16.js";

describe("BT20-027 Slayerdramon", () => {
  it("registers the compiled card and preserves piercing", () => {
    expect(getEffectModule("BT20-027")).toBeDefined();
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Piercing" }] });
  });

  it("trashes three cards from an opposing stack and deletes a stackless Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "TrashDigivolution",
            amount: 3,
            target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          },
          { kind: "Delete", target: { filter: { controller: "opponent", digivolutionCards: "none" } } },
        ],
      });
    }
  });

  it("unsuspends an own Dracomon/Examon-text Digimon after the opponent loses security", () => {
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
  });

  it("installs inherited leave prevention paid by suspending this Digimon", () => {
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          affectsAll: true,
          leaveCause: "otherThanBattle",
          cost: { kind: "suspend", target: { isSelf: true } },
        },
      ],
    });
  });

  it("trashes three sources, then deletes the now-stackless opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "slayerdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-017", as: "stacked", under: ["BT20-008", "BT20-013", "BT20-014"] },
            { card: "BT20-017", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("stacked").permanentId);
    const stackedId = s.perm("stacked").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("slayerdramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === stackedId));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-014", "BT20-013", "BT20-008", "BT20-017"]),
    );
    expect(s.perm("untouched")).toBeDefined();
    expect(observe(s.engine).hasPierce(s.perm("slayerdramon"))).toBe(true);
  });

  it("publicly pays the exact 12 play cost before resolving On Play stack trash and deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-027", as: "slayer" }] },
        1: {
          battleArea: [
            { card: "BT20-017", as: "stacked", under: ["BT20-008", "BT20-013", "BT20-014"] },
            { card: "BT20-017", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("slayer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-008", "BT20-013", "BT20-014", "BT20-017"]),
    );
    expect(s.perm("untouched")).toBeDefined();
  });

  it("unsuspends only a Dracomon/Examon-text ally after opponent security removal, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-027", as: "slayerdramon" },
            { card: "BT20-023", suspended: true, as: "textMatch" },
            { card: "BT20-010", suspended: true, as: "nonMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("textMatch").permanentId);
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => !s.perm("textMatch").isSuspended);
    expect(s.perm("nonMatch").isSuspended).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("textMatch").permanentId]);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("textMatch").isSuspended).toBe(true);
  });

  it.each([true, false] as const)(
    "resolves the printed optional unsuspend from an actual opponent security removal (accept=%s)",
    async (accept) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-027", as: "slayer" },
              { card: "BT20-023", as: "attacker" },
              { card: "BT20-010", suspended: true, as: "ownNonMatch" },
            ],
            deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT20-023", suspended: true, as: "opponentMatch" }],
            security: ["BT1-010", "BT1-010", "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
        },
        {
          autoAcceptOptional: accept,
          autoDeclineOptional: !accept,
          autoSelectCards: true,
          preferInstanceIds: preferred,
        },
      );
      preferred.push(s.perm("attacker").permanentId);
      s.state.memory = 10;
      await s.ready();

      const ownTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await advance(s.engine).verb.suspend([s.perm("ownNonMatch").permanentId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.perm("attacker").isSuspended).toBe(!accept);
      expect(s.perm("ownNonMatch").isSuspended).toBe(true);
      expect(s.perm("opponentMatch").isSuspended).toBe(true);

      if (!accept) {
        advance(s.engine).endMainPhaseIfOpen(0);
        await ownTurn;
        return;
      }

      // The second qualifying removal is in the same turn: the printed OPT must refuse it.
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length === 2 &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.perm("attacker").isSuspended).toBe(true);

      advance(s.engine).endMainPhaseIfOpen(0);
      await ownTurn;
      s.state.turnSeat = 1;
      s.state.memory = 7;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
      s.state.turnSeat = 0;
      s.state.memory = 7;
      const nextOwnTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length === 3 &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.perm("attacker").isSuspended).toBe(false);
      advance(s.engine).endMainPhaseIfOpen(0);
      await nextOwnTurn;
    },
  );

  it("prevents a matching Digimon's public bounce by suspending a legal level-7 host, then enforces its OPT", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-086", as: "host", under: ["BT20-027"] },
            { card: "BT20-023", as: "firstMatch" },
            { card: "BT20-023", as: "secondMatch" },
            { card: "BT20-010", as: "nonMatch" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-027" }],
          hand: [
            { card: "ST2-16", as: "firstBounce" },
            { card: "ST2-16", as: "secondBounce" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("firstMatch").permanentId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstBounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("firstMatch").permanentId));
    expect(s.perm("firstMatch")).toBeDefined();
    expect(s.perm("host").isSuspended).toBe(true);

    // Re-open the cost source, then prove the once-per-turn replacement is consumed.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    preferred.length = 0;
    preferred.push(s.perm("secondMatch").permanentId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondBounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "BT20-023"));
    expect(s.state.players[0]!.hand.filter((c) => c.cardId === "BT20-023")).toHaveLength(1);
    expect(s.perm("firstMatch")).toBeDefined();
    expect(s.perm("nonMatch")).toBeDefined();
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it.each([
    ["accepts a matching target", "BT20-023", true, false],
    ["refuses the optional replacement", "BT20-023", false, false],
    ["cannot pay while the host is already suspended", "BT20-023", true, true],
    ["does not replace a nonmatching target", "BT20-010", true, false],
  ] as const)("public bounce replacement %s", async (_caseName, targetCard, accept, hostAlreadySuspended) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-084", suspended: hostAlreadySuspended, as: "host", under: ["BT20-027"] },
            { card: targetCard, as: "target" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "blueSource" }],
          hand: [{ card: "ST2-16", as: "bounce" }],
        },
      },
      {
        autoAcceptOptional: accept && !hostAlreadySuspended,
        autoDeclineOptional: !accept || hostAlreadySuspended,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bounce").instanceId));
    const targetRemains = accept && !hostAlreadySuspended && targetCard === "BT20-023";
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("target").instanceId)).toBe(
      targetRemains,
    );
    expect(s.perm("host").isSuspended).toBe(hostAlreadySuspended || targetRemains);
  });

  it("uses Piercing in a public battle to check security after deleting the weaker blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "slayer" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "blocker" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("slayer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-010")).toBe(false);
  });

  it("resets the inherited leave-prevention Once Per Turn on a later opponent turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-084", as: "host", under: ["BT20-027"] },
            { card: "BT20-023", as: "firstTarget" },
            { card: "BT20-023", as: "secondTarget" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "blueSource" }],
          hand: [
            { card: "ST2-16", as: "firstBounce" },
            { card: "ST2-16", as: "secondBounce" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const firstBounceId = s.inst("firstBounce").instanceId;
    const secondBounceId = s.inst("secondBounce").instanceId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    preferred.push(s.perm("firstTarget").permanentId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstBounceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstBounceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstTarget").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    // A complete own turn supplies the real Once Per Turn boundary and
    // automatically reopens the host for the next opponent turn.
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    preferred.length = 0;
    preferred.push(s.perm("secondTarget").permanentId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: secondBounceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === secondBounceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondTarget").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
  });

  it("publicly evolves from Wingdramon and resolves the printed stack trash/delete sequence", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-025", as: "wingdramon" }], hand: [{ card: "BT20-027", as: "slayerdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-017", as: "stacked", under: ["BT20-008", "BT20-013", "BT20-014"] },
            { card: "BT20-017", as: "untouched", under: ["BT20-008"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wingdramon").permanentId,
        instanceId: s.inst("slayerdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("wingdramon").topCard.cardId === "BT20-027" &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.filter((card) => ["BT20-014", "BT20-013", "BT20-008"].includes(card.cardId))
          .length === 3,
    );
    expect(s.perm("wingdramon").stack.map((card) => card.cardId)).toContain("BT20-025");
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT20-017" && permanent.stack.length === 0,
      ),
    ).toBe(false);
    expect(s.perm("untouched").stack.map((card) => card.cardId)).toEqual(["BT20-008"]);
  });

  it("allows inherited leave prevention to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-086", as: "host", under: ["BT20-027"] },
            { card: "BT20-023", as: "match" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("match").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-023")).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
