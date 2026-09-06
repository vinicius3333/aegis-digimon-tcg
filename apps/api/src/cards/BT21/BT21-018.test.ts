import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-018.js";
import "../index.js";

describe("BT21-018 DoGatchmon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Rush, Raid, and the once-per-turn attack after linking", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "Attack",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                withoutSuspending: false,
                optional: true,
              },
            ],
          },
        ],
      }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Gatchmon", "Navimon", "Tweetmon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Attack",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            withoutSuspending: false,
            optional: true,
          },
        ],
      }),
    );
    const linkedWatcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(linkedWatcher).toMatchObject({ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true } });
  });

  it("links to an Appmon for 2, grants 3000 DP, and lets the host attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT21-018", as: "link" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const beforeDP = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(beforeDP + 3000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("publicly links DoGatchmon and resolves its When Linking attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT21-018", as: "link" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain("BT21-018");
    expect(s.state.memory).toBe(3);
  });

  it("attacks immediately after a public play because of Rush", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-018", as: "dogatchmon" }] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dogatchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("dogatchmon").topCard.cardId === "BT21-018");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dogatchmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Raid to redirect an attack to the opponent's highest-DP unsuspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "dogatchmon" }],
        },
        1: {
          battleArea: [
            { card: "BT21-019", as: "highest" },
            { card: "BT1-010", as: "lower" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const highestId = s.perm("highest").permanentId;
    preferred.push(highestId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dogatchmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lower").permanentId),
    ).toBe(true);
  });

  it("publicly links onto DoGatchmon and resolves only one self-linked attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host" }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain("BT21-009");
  });

  it("publicly links Gatchmon plus Navimon and fuses through Haru's watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [
            { card: "BT21-047", as: "navimon" },
            { card: "BT21-018", as: "dogatchmon" },
          ],
          deck: [{ card: "BT1-001", as: "fusionDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("navimon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("navimon").instanceId));
    await settle(() => s.perm("host").topCard.cardId === "BT21-018");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-009"]);
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain("BT21-047");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fusionDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("dogatchmon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("haru").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it.each([
    ["Gatchmon", "Navimon", "BT21-009", "BT21-047"],
    ["Gatchmon", "Tweetmon", "BT21-009", "P-190"],
    ["Navimon", "Gatchmon", "BT21-047", "BT21-009"],
    ["Navimon", "Tweetmon", "BT21-047", "P-190"],
    ["Tweetmon", "Gatchmon", "P-190", "BT21-009"],
    ["Tweetmon", "Navimon", "P-190", "BT21-047"],
  ])("supports the %s plus %s App Fusion pair", async (_hostName, _linkName, hostCard, linkCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: hostCard, as: "host" },
          ],
          hand: [
            { card: linkCard, as: "link" },
            { card: "BT21-018", as: "fusion" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-018");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([hostCard]);
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain(linkCard);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("fusion").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("haru").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it.each([
    ["same-name", "BT21-009", "BT21-009"],
    ["non-recipe", "BT21-009", "BT21-059"],
  ])("rejects the %s App Fusion pair after a public link", async (_label, hostCard, linkCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: hostCard, as: "host" },
          ],
          hand: [
            { card: linkCard, as: "link" },
            { card: "BT21-018", as: "fusion" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("host").topCard.cardId).toBe(hostCard);
    expect(s.perm("host").linked.map((card) => card.cardId)).toContain(linkCard);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fusion").instanceId);
    expect(s.state.memory).toBe(linkCard === "BT21-059" ? 8 : 9);
  });

  it("attacks once when its own stack gets publicly linked and ignores another stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "dogatchmon" },
            { card: "BT21-009", as: "other" },
          ],
          hand: [
            { card: "BT21-009", as: "otherLink" },
            { card: "BT21-009", as: "ownLink" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("otherLink").instanceId,
        targetPermanentId: s.perm("other").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").linked.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(3);
    const ownLink = s.state.players[0]!.hand.find((card) => card.cardId === "BT21-009");
    expect(ownLink).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: ownLink!.instanceId,
        targetPermanentId: s.perm("dogatchmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.perm("dogatchmon").isSuspended).toBe(true);
  });

  it("does not attack a second time in the same turn after a public unsuspend", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "dogatchmon" },
            { card: "BT1-089", as: "greenTamer" },
          ],
          hand: [
            { card: "BT21-009", as: "firstLink" },
            { card: "BT21-009", as: "secondLink" },
            { card: "BT4-108", as: "unsuspendOption" },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstLink").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("dogatchmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("dogatchmon").isSuspended);
    expect(s.perm("dogatchmon").topCard.cardId).toBe("BT21-018");

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("dogatchmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dogatchmon").linked.some((card) => card.instanceId === s.inst("secondLink").instanceId));
    expect(s.perm("dogatchmon").linked.some((card) => card.instanceId === s.inst("secondLink").instanceId)).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("dogatchmon").isSuspended).toBe(false);
  });

  it("may decline both link-granted attack paths", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "dogatchmon" }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("dogatchmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dogatchmon").linked.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gets a second public linked attack after the next real turn unsuspends it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "dogatchmon" }],
          hand: [
            { card: "BT21-009", as: "firstLink" },
            { card: "BT21-009", as: "secondLink" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"], deck: ["BT1-005", "BT1-006", "BT1-007"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("dogatchmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("dogatchmon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("dogatchmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
