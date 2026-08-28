import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-085.js";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-085 compiled behavior", () => {
  it("proves Assembly's five different-level Chronomon-text-or-Shaman materials and keywords", () => {
    expect(getCardDefinition("BT26-085")).toMatchObject({
      nameEn: "Giant Slayer",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 12,
      dp: 14000,
      attributes: ["NO DATA"],
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          {
            count: 5,
            differentLevels: true,
            nameOrTrait: [
              { tokens: ["Chronomon"], match: "text" },
              { tokens: ["Shaman"], match: "trait" },
            ],
          },
        ],
      },
    ]);
    expect(compiled.keywords).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
  });

  it("protects DP and the evolution stack, then replaces leaving with a free Destroy Mode digivolution", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toEqual([
      expect.objectContaining({
        kind: "Restrict",
        restriction: "dpImmune",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
      }),
      expect.objectContaining({ kind: "StackTrashLock", duration: "untilOpponentTurnEnd" }),
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { isSelf: true },
          into: { nameOrTrait: [{ tokens: ["Chronomon: Destroy Mode"], match: "nameExact" }] },
        },
        { kind: "Prevent", condition: { kind: "ifThisEffectDigivolved" } },
      ],
    });
  });

  it("plays by Assembly with five matching cards at five different levels", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-085", as: "giantSlayer" }],
        trash: [
          { card: "BT26-001", as: "level2" },
          { card: "BT26-009", as: "level3" },
          { card: "BT26-011", as: "level4" },
          { card: "BT26-015", as: "level5" },
          { card: "BT26-016", as: "level6" },
        ],
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("giantSlayer").instanceId,
        assembly: {
          materialInstanceIds: ["level2", "level3", "level4", "level5", "level6"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-085"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT26-085");
    expect(new Set(played?.stack.map(({ cardId }) => cardId))).toEqual(
      new Set(["BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("rejects Assembly when the five matching materials don't have different levels", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-085", as: "giantSlayer" }],
        trash: [
          { card: "BT26-009", as: "first" },
          { card: "BT26-009", as: "second" },
          { card: "BT26-009", as: "third" },
          { card: "BT26-009", as: "fourth" },
          { card: "BT26-009", as: "fifth" },
        ],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("giantSlayer").instanceId,
        assembly: {
          materialInstanceIds: ["first", "second", "third", "fourth", "fifth"].map((alias) => s.inst(alias).instanceId),
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("installs the opponent DP immunity restriction on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-085", as: "giantSlayer" }] } });

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("giantSlayer"));

    expect(observe(s.engine).isRestricted(s.perm("giantSlayer"), "dpImmune")).toBe(true);
  });

  it("blocks opponent DP reduction and stack trash while allowing its controller's effects", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-085",
            as: "giantSlayer",
            under: [
              { card: "BT26-009", as: "opponentTarget" },
              { card: "BT26-011", as: "ownTarget" },
            ],
          },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("giantSlayer"));
    const originalDp = s.perm("giantSlayer").currentDP;

    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(
      s.perm("giantSlayer").permanentId,
      -3000,
      EffectDuration.UntilOpponentTurnEnd,
    );
    advance(s.engine).verb.leaveEffectResolution();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("giantSlayer").permanentId,
      [s.inst("opponentTarget").instanceId],
      1,
    );

    expect(s.perm("giantSlayer").currentDP).toBe(originalDp);
    expect(s.perm("giantSlayer").stack.map(({ instanceId }) => instanceId)).toContain(
      s.inst("opponentTarget").instanceId,
    );

    advance(s.engine).verb.enterEffectResolution(0);
    await advance(s.engine).verb.modifyDP(
      s.perm("giantSlayer").permanentId,
      -3000,
      EffectDuration.UntilOpponentTurnEnd,
    );
    advance(s.engine).verb.leaveEffectResolution();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("giantSlayer").permanentId,
      [s.inst("ownTarget").instanceId],
      0,
    );

    expect(s.perm("giantSlayer").currentDP).toBe(originalDp - 3000);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("ownTarget").instanceId);
  });

  it("uses Collision to force a plain opposing Digimon to block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-085", as: "giantSlayer" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "plainBlocker", dp: 3000 }],
        security: ["BT1-001"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("giantSlayer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("plainBlocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses Blocker against an opponent attack and Reboot during the opponent's active phase", async () => {
    const blocking = setupEngine({
      0: {
        battleArea: [{ card: "BT26-085", as: "giantSlayer" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    blocking.state.turnSeat = 1;
    await blocking.ready();
    expect(observe(blocking.engine).hasKeyword(blocking.perm("giantSlayer"), "Blocker")).toBe(true);

    expect(
      blocking.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: blocking.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => blocking.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      blocking.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: blocking.perm("giantSlayer").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => blocking.events.some(({ kind }) => kind === "combatResolved"));
    expect(blocking.state.players[0]!.security).toHaveLength(1);

    const reboot = setupEngine({
      0: { battleArea: [{ card: "BT26-085", as: "giantSlayer", suspended: true }] },
    });
    reboot.state.turnSeat = 1;
    await reboot.ready();
    expect(observe(reboot.engine).hasKeyword(reboot.perm("giantSlayer"), "Reboot")).toBe(true);
    await advance(reboot.engine).runTurn(1);
    expect(reboot.perm("giantSlayer").isSuspended).toBe(false);
  });

  it("replaces leaving with a free Destroy Mode digivolution from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-085", as: "giantSlayer" }],
          hand: [{ card: "BT26-060", as: "destroyMode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("giantSlayer").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("giantSlayer").topCard.cardId === "BT26-060");

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("replaces leaving with Destroy Mode from trash and may decline the replacement", async () => {
    const fromTrash = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-085", as: "giantSlayer" }],
          trash: [{ card: "BT26-060", as: "destroyMode" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await fromTrash.ready();

    expect(
      await advance(fromTrash.engine).verb.deletePermanent([fromTrash.perm("giantSlayer").permanentId], "byEffect"),
    ).toBe(0);
    await settle(() => fromTrash.perm("giantSlayer").topCard.cardId === "BT26-060");
    expect(fromTrash.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-085", as: "giantSlayer" }],
          hand: [{ card: "BT26-060", as: "destroyMode" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();

    expect(
      await advance(declined.engine).verb.deletePermanent([declined.perm("giantSlayer").permanentId], "byEffect"),
    ).toBe(1);
    expect(declined.state.players[0]!.battleArea).toHaveLength(0);
    expect(declined.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-085");
    expect(declined.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-060");
  });

  it("leaves the battle area when no Destroy Mode is available to digivolve into", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-085", as: "giantSlayer" }],
          hand: [{ card: "BT26-016", as: "wrongChronomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("giantSlayer").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-085");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-016");
  });
});
