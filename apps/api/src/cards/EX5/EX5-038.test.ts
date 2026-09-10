import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-076.js";
import "../P/P-130.js";
import "../index.js";
import { compiled } from "./EX5-038.js";

describe("EX5-038 Vikaralamon", () => {
  it("matches the catalog and encodes draw, unique Deva breeding play, battle deletion OPT, and inheritance", () => {
    expect(getCardDefinition("EX5-038")).toMatchObject({
      cardId: "EX5-038",
      nameEn: "Vikaralamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Deva"],
      effectText: expect.stringContaining("play 1 [Deva]"),
      inheritedEffectText: expect.stringContaining("Four Sovereigns"),
    });
    expect(getCardDefinition("EX5-038")?.inheritedEffectText).toContain("Piercing");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        from: ["hand"],
        notSameNameAs: ["battleArea", "trash"],
        target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } }],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
          while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ match: "trait" }] } },
        },
      ],
    });
  });

  it("draws and publicly plays a unique Deva into breeding", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT10-079", as: "deva" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vikaralamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("deva").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("deva").instanceId),
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("excludes a same-name card in battle area or trash, but ignores names under Digimon (Q3608/Q3609)", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: "BT10-079", as: "sameName" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: "BT10-079", as: "sameName" }] } : {}),
            hand: [
              { card: "EX5-038", as: "vikaralamon" },
              { card: "BT10-079", as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vikaralamon").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    }

    const under = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-041", as: "host", under: ["BT10-079"] }],
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await under.ready();
    under.state.memory = 10;
    expect(under.engine.applyIntent(0, { type: "playCard", instanceId: under.inst("vikaralamon").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => under.state.players[0]!.breeding?.topCard?.instanceId === under.inst("candidate").instanceId);
    expect(under.state.players[0]!.hand.map((card) => card.instanceId)).toContain(under.inst("drawn").instanceId);
  });

  it("suppresses the breeding candidate's On Play effect and play watchers (Q3610/Q3612)", async () => {
    const suppression = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT13-053", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-021", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await suppression.ready();
    suppression.state.memory = 10;
    expect(
      suppression.engine.applyIntent(0, { type: "playCard", instanceId: suppression.inst("vikaralamon").instanceId }),
    ).toEqual({ ok: true });
    await settle(
      () => suppression.state.players[0]!.breeding?.topCard?.instanceId === suppression.inst("candidate").instanceId,
    );
    expect(suppression.perm("target").isSuspended).toBe(false);

    const watcher = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT10-076", as: "troopmon", under: ["BT10-071"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await watcher.ready();
    watcher.state.memory = 10;
    expect(
      watcher.engine.applyIntent(0, { type: "playCard", instanceId: watcher.inst("vikaralamon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () => watcher.state.players[0]!.breeding?.topCard?.instanceId === watcher.inst("candidate").instanceId,
    );
    expect(watcher.state.memory).toBe(2);
    expect(watcher.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT10-071");
  });

  it("does not let a breeding Digimon attack after public movement in the same turn (Q3611)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT10-079", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vikaralamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId,
      ),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("candidate").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("draws but cannot play the Deva while an effect-play restriction is active (Q3613)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vikaralamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("unsuspends once after a public battle deletion, then stays suspended on the second deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-038", as: "source", suspended: true },
          { card: "BT1-010", as: "attackerOne", dp: 8000 },
          { card: "BT1-010", as: "attackerTwo", dp: 8000 },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-021", as: "targetOne", dp: 1000, suspended: true },
          { card: "BT1-021", as: "targetTwo", dp: 1000, suspended: true },
        ],
        security: ["BT1-009", "BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const targetOneId = s.perm("targetOne").permanentId;
    const targetTwoId = s.perm("targetTwo").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "permanent", permanentId: targetOneId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetOneId));
    expect(s.perm("source").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("source").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "permanent", permanentId: targetTwoId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetTwoId));
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("grants inherited Piercing only to a Four Sovereigns host on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-041", as: "host", under: ["EX5-038"] }] },
      1: {
        battleArea: [{ card: "BT1-021", as: "target", dp: 1000, suspended: true }],
        security: ["BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);

    const negative = setupEngine({ 0: { battleArea: [{ card: "EX5-038", as: "host" }] } });
    await negative.ready();
    expect(observe(negative.engine).hasPierce(negative.perm("host"))).toBe(false);
  });
});
