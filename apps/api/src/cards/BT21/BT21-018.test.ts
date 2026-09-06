import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("fuses the printed Gatchmon plus Navimon pair through the production App Fusion verb", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
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
    const fused = await advance(s.engine).verb.appFuseInto(s.perm("host").permanentId, s.inst("dogatchmon").instanceId);
    expect(fused?.topCard.cardId).toBe("BT21-018");
    expect(fused?.stack.map((card) => card.cardId)).toEqual(["BT21-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fusionDraw").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("attacks once when its own stack gets linked and ignores another stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "dogatchmon" },
            { card: "BT21-009", as: "other" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(3);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("dogatchmon").permanentId });
    await settle(() => s.state.players[1]!.security.length === 2);
    await advance(s.engine).verb.unsuspend([s.perm("dogatchmon").permanentId]);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("dogatchmon").permanentId });
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("may decline both link-granted attack paths", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-018", as: "dogatchmon" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("dogatchmon").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
