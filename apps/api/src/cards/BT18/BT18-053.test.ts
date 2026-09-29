import { describe, expect, it } from "vitest";
import {
  assertNoLoudGap,
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type SeatSpec,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-053.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-084.js";
import "../BT18/BT18-048.js";
import "../BT18/BT18-049.js";
import "../BT18/BT18-090.js";
import "../ST1/ST1-16.js";

describe("BT18-053 JetSilphymon", () => {
  it("suspends the exact opponent and prevents its unsuspension when digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        isFromHand: true,
        actions: [{ kind: "Digivolve", costOverride: 3, ignoreRequirements: true }],
      },
      { trigger: "Static", keywords: [{ keyword: "Raid" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "SelectBind" },
          { kind: "Suspend", target: { fromSelectionRef: "suspendedTarget" } },
          { kind: "Restrict", target: { fromSelectionRef: "suspendedTarget" }, restriction: "unsuspend" },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000 }] },
    ]);
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-048", as: "base" }], hand: [{ card: "BT18-053", as: "jetsilphymon" }] },
        1: {
          battleArea: [
            { card: "BT1-087", as: "opponentTarget" },
            { card: "BT1-030", as: "otherOpponent" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jetsilphymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTarget"), "unsuspend"));

    expect(s.state.memory).toBe(7);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTarget"), "unsuspend")).toBe(true);
    expect(s.perm("otherOpponent").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("otherOpponent"), "unsuspend")).toBe(false);
    assertNoLoudGap(s);
  });

  it("pays both named trash placements and 3 memory for its hand Main evolution", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          trash: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-049", as: "zephyrmon" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-030", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(
      s.perm("zoe").topCard!.instanceId,
      s.inst("kazemon").instanceId,
      s.inst("zephyrmon").instanceId,
    );
    s.state.memory = 5;
    await s.ready();

    const effect = JSON.parse(s.inst("jetsilphymon").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effect).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("jetsilphymon").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard?.cardId === "BT18-053" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.perm("zoe").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-048", "BT18-049", "BT18-090"]),
    );
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("cannot partially pay the hand Main cost without Zephyrmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-090", as: "zoe" }],
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          trash: [{ card: "BT18-048", as: "kazemon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const effect = JSON.parse(s.inst("jetsilphymon").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effect).toHaveLength(0);

    expect(s.perm("zoe").topCard?.cardId).toBe("BT18-090");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("kazemon").instanceId);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("selects a mixed green/red Tamer and places both named sources under that chosen Tamer", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-090", as: "zoe" },
            { card: "AD1-022", as: "mixedTamer" },
          ],
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          trash: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-049", as: "zephyrmon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(
      s.perm("mixedTamer").topCard!.instanceId,
      s.inst("kazemon").instanceId,
      s.inst("zephyrmon").instanceId,
    );
    s.state.memory = 5;
    await s.ready();
    const effect = JSON.parse(s.inst("jetsilphymon").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("jetsilphymon").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mixedTamer").topCard?.cardId === "BT18-053");
    expect(s.perm("mixedTamer").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["AD1-022", "BT18-048", "BT18-049"]),
    );
    expect(s.perm("zoe").topCard?.cardId).toBe("BT18-090");
    assertNoLoudGap(s);
  });

  it("has Raid and gives +2000 DP only to its inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-053", as: "self" },
          { card: "BT1-030", as: "host", under: ["BT18-053"] },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("self"), "Raid")).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });
});

describe("BT18-053 JetSilphymon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

  function handMainKeys(s: EngineSetup, alias: string): string[] {
    const entries = JSON.parse(s.inst(alias).activatableEffectsJson || "[]") as { effectKey: string }[];
    return entries.map(({ effectKey }) => effectKey);
  }

  function zoeBoard(seat0: SeatSpec, options: SetupEngineOptions = {}, seat1: SeatSpec = {}): EngineSetup {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          trash: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-049", as: "zephyrmon" },
          ],
          deck: [...FILLER],
          ...seat0,
        },
        1: { battleArea: [{ card: "BT1-030", as: "opponent" }], security: 2, deck: [...FILLER], ...seat1 },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds, ...options },
    );
    preferredInstanceIds.push(s.perm("zoe").topCard.instanceId);
    return s;
  }

  async function activateOntoZoe(s: EngineSetup): Promise<void> {
    s.state.memory = 5;
    await s.ready();
    const [effectKey] = handMainKeys(s, "jetsilphymon");
    expect(effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("jetsilphymon").instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard.cardId === "BT18-053" && s.state.pendingDecision === undefined);
    await drainMicrotasks();
  }

  it("activates its {Hand} [Main] effect only from the hand, never from the battle area or trash (Q2983)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-090", as: "zoe" },
            { card: "BT18-053", as: "fieldCopy", under: ["BT18-048"] },
          ],
          hand: [{ card: "BT18-053", as: "handCopy" }],
          trash: [
            { card: "BT18-053", as: "trashCopy" },
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-049", as: "zephyrmon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const [handKey] = handMainKeys(s, "handCopy");
    expect(handKey).toBeDefined();
    expect(handMainKeys(s, "trashCopy")).toEqual([]);
    const fieldEntries = JSON.parse(s.perm("fieldCopy").activatableEffectsJson || "[]") as { instanceId: string }[];
    expect(fieldEntries.filter(({ instanceId }) => instanceId === s.inst("fieldCopy").instanceId)).toEqual([]);

    for (const alias of ["trashCopy", "fieldCopy"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst(alias).instanceId,
          effectKey: handKey!,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(s.perm("zoe").topCard.cardId).toBe("BT18-090");
    expect(s.state.memory).toBe(5);
  });

  it("cannot activate by placing only one of [Kazemon] and [Zephyrmon] under the Tamer (Q2984)", async () => {
    const boardWith = (trash: SeatSpec["trash"]) =>
      setupEngine(
        {
          0: { battleArea: [{ card: "BT18-090", as: "zoe" }], hand: [{ card: "BT18-053", as: "jetsilphymon" }], trash },
        },
        { autoSelectCards: true },
      );

    const both = boardWith(["BT18-048", "BT18-049"]);
    both.state.memory = 5;
    await both.ready();
    const [effectKey] = handMainKeys(both, "jetsilphymon");
    expect(effectKey).toBeDefined();

    for (const onlyOne of ["BT18-048", "BT18-049"]) {
      const partial = boardWith([{ card: onlyOne, as: "lone" }]);
      partial.state.memory = 5;
      await partial.ready();
      expect(handMainKeys(partial, "jetsilphymon")).toEqual([]);
      expect(
        partial.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: partial.inst("jetsilphymon").instanceId,
          effectKey: effectKey!,
        }),
      ).toMatchObject({ ok: false });
      await drainMicrotasks();
      expect(partial.perm("zoe").topCard.cardId).toBe("BT18-090");
      expect(partial.perm("zoe").stack).toHaveLength(0);
      expect(partial.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
        partial.inst("lone").instanceId,
      ]);
      expect(partial.state.memory).toBe(5);
    }
  });

  it("digivolves the Tamer as-is: digivolve watchers don't trigger and a can't-digivolve lock doesn't stop it (Q2985)", async () => {
    const watched = zoeBoard(
      {
        battleArea: [
          { card: "BT18-090", as: "zoe" },
          { card: "BT16-084", as: "watcher" },
        ],
      },
      { autoAcceptOptional: true },
    );
    await activateOntoZoe(watched);
    // JetSilphymon's own [When Digivolving] shares the watcher's trigger window, so it marks that window as resolved.
    await settle(() => watched.perm("opponent").isSuspended && watched.state.pendingDecision === undefined);
    expect(watched.perm("watcher").isSuspended).toBe(false);
    expect(watched.state.memory).toBe(2);

    const watchedControl = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT16-084", as: "watcher" },
          ],
          hand: [{ card: "BT18-053", as: "jetsilphymon" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-030", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    watchedControl.state.memory = 5;
    await watchedControl.ready();
    expect(
      watchedControl.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: watchedControl.perm("kazemon").permanentId,
        instanceId: watchedControl.inst("jetsilphymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => watchedControl.perm("watcher").isSuspended);
    expect(watchedControl.state.memory).toBe(3);

    const locked = zoeBoard({
      breeding: { card: "BT13-007", as: "kingDrasil" },
      battleArea: [
        { card: "BT18-090", as: "zoe" },
        { card: "BT18-048", as: "fieldKazemon" },
      ],
    });
    locked.state.memory = 5;
    await locked.ready();
    expect(
      locked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: locked.perm("fieldKazemon").permanentId,
        instanceId: locked.inst("jetsilphymon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    await activateOntoZoe(locked);
    expect(locked.perm("zoe").topCard.cardId).toBe("BT18-053");
    expect(locked.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when the Tamer digivolves (Q2986)", async () => {
    const s = zoeBoard({
      battleArea: [{ card: "BT18-090", as: "zoe" }],
      deck: [{ card: "BT1-010", as: "bonusCard" }],
    });
    await activateOntoZoe(s);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusCard").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("cannot attack the turn it digivolves from a Tamer that was played that turn (Q2987)", async () => {
    const fresh = zoeBoard({ battleArea: [{ card: "BT18-090", as: "zoe", enteredThisTurn: true }] });
    await activateOntoZoe(fresh);
    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("zoe").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(fresh.perm("zoe").isSuspended).toBe(false);

    const established = zoeBoard({ battleArea: [{ card: "BT18-090", as: "zoe" }] });
    await activateOntoZoe(established);
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("zoe").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer under it as a digivolution card that is trashed when it leaves the field (Q6630)", async () => {
    const s = zoeBoard(
      { battleArea: [{ card: "BT18-090", as: "zoe" }] },
      { autoDeclineOptional: true },
      {
        battleArea: [
          { card: "BT1-030", as: "opponent" },
          { card: "BT1-010", as: "redSource" },
        ],
        hand: [{ card: "ST1-16", as: "gaiaForce" }],
      },
    );
    await activateOntoZoe(s);
    const zoeCard = s.inst("zoe");
    expect(s.perm("zoe").stack.map(({ instanceId }) => instanceId)).toContain(zoeCard.instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    await drainMicrotasks();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(zoeCard.instanceId);
  });
  it("does not gain the [Security] effect of a Tamer card in its digivolution cards (Q6631)", async () => {
    const opponentChecksSecurity = async (security: SeatSpec["security"], battleArea: SeatSpec["battleArea"]) => {
      const s = setupEngine({
        0: { battleArea, security },
        1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
      });
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.length === 0 && s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return s;
    };

    const stacked = await opponentChecksSecurity(
      [{ card: "BT1-010", as: "plainSecurity" }],
      [{ card: "BT18-053", as: "jet", under: ["BT18-048", { card: "BT18-090", as: "sourceZoe" }] }],
    );
    expect(stacked.perm("jet").stack.map(({ instanceId }) => instanceId)).toContain(
      stacked.inst("sourceZoe").instanceId,
    );
    expect(stacked.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT18-053"]);
    expect(stacked.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      stacked.inst("plainSecurity").instanceId,
    ]);

    const revealed = await opponentChecksSecurity([{ card: "BT18-090", as: "securityZoe" }], [{ card: "BT18-053" }]);
    expect(revealed.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      revealed.inst("securityZoe").instanceId,
    );
  });

  it("gains the inherited effect of a Tamer card in its digivolution cards (Q6632)", async () => {
    const s = zoeBoard(
      {
        battleArea: [{ card: "BT18-090", as: "zoe" }],
        hand: [
          { card: "BT18-053", as: "jetsilphymon" },
          { card: "BT18-088", as: "inheritedTamer" },
        ],
      },
      { autoAcceptOptional: true },
    );
    await activateOntoZoe(s);
    await settle(() => s.perm("opponent").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(2);
    expect(s.perm("zoe").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("zoe").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zoe").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("inheritedTamer").instanceId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(2);

    const withoutTamerSource = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-053", as: "jet", under: ["BT18-048", "BT18-049"] }],
          hand: [{ card: "BT18-088", as: "inheritedTamer" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "victim", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withoutTamerSource.ready();
    expect(
      withoutTamerSource.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withoutTamerSource.perm("jet").permanentId,
        target: { kind: "permanent", permanentId: withoutTamerSource.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        withoutTamerSource.state.players[1]!.battleArea.length === 0 &&
        withoutTamerSource.state.pendingDecision === undefined,
    );
    await drainMicrotasks();
    expect(withoutTamerSource.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      withoutTamerSource.inst("inheritedTamer").instanceId,
    ]);
  });
});
