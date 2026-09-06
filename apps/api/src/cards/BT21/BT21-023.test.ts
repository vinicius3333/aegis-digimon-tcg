import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-023.js";
import "../index.js";

describe("BT21-023 Globemon", () => {
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

  it("links a level 4 or lower Digimon from the default hand/stack zones and deletes an equal-or-lower DP opponent once per turn", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "Link",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 4 },
                  hasLinkRequirement: true,
                  or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
                },
                count: 1,
              },
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        }),
      );
    }
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
                kind: "Delete",
                target: {
                  filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["DoGatchmon", "Timemon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: { filter: expect.objectContaining({ controller: "opponent" }), count: 1 },
          }),
        ],
      }),
    );
  });

  it("links a legal level-4 card for free on play and preserves the 9-cost play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-023", as: "globemon" },
            { card: "BT21-018", as: "link" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("globemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const globemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-023");
      return globemon?.linked.some((card) => card.instanceId === s.inst("link").instanceId) ?? false;
    });
    expect(s.state.memory).toBe(1);
    const globemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-023")!;
    expect(globemon.currentDP).toBe(13000);
  });

  it("evolves publicly through a legal level-3/4/5 stack and links a free level-4 card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-002", as: "host" }],
          hand: [
            { card: "BT21-010", as: "lv3" },
            { card: "BT21-019", as: "lv4" },
            { card: "BT21-023", as: "globemon" },
            { card: "BT21-018", as: "link" },
          ],
        },
      },
      { autoAcceptOptional: true, autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    for (const alias of ["lv3", "lv4"] as const) {
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: s.inst(alias).instanceId }),
      ).toEqual({
        ok: true,
      });
      await settle(() => s.perm("host").topCard.instanceId === s.inst(alias).instanceId);
    }
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: s.inst("globemon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("globemon").instanceId);

    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("publicly App Fuses DoGatchmon and Timemon into Globemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host", linked: [{ card: "BT21-059", as: "timemon" }] }],
          hand: [{ card: "BT21-023", as: "globemon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("globemon").instanceId,
        appFusionLinkedInstanceId: s.inst("timemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-023");
    expect(s.perm("host").topCard.cardId).toBe("BT21-023");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-018", "BT21-059"]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("rejects linkless and level-5 cards and permits declining a legal link", async () => {
    for (const [card, options] of [
      ["BT1-009", { autoAcceptOptional: true, autoSelectCards: true }],
      ["BT21-023", { autoAcceptOptional: true, autoSelectCards: true }],
      ["BT21-018", { autoDeclineOptional: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT21-023", as: "globemon" },
              { card, as: "candidate" },
            ],
          },
        },
        options,
      );
      s.state.memory = 10;
      await s.ready();
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("globemon").instanceId });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-023"));
      const globemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-023")!;
      expect(globemon.linked).toHaveLength(0);
      expect(s.state.players[0]!.hand.map((candidate) => candidate.instanceId)).toContain(
        s.inst("candidate").instanceId,
      );
    }
  });

  it("deletes only an equal-or-lower DP target once when its own stack is linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-023", as: "globemon", dp: 10000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "equal", dp: 10000 },
            { card: "BT1-010", as: "higher", dp: 11000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("globemon").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("higher").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("globemon").permanentId });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("publicly links twice, deleting one eligible victim first and none on the second link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-023", as: "globemon" }],
          hand: [
            { card: "BT21-018", as: "firstLink" },
            { card: "BT21-018", as: "secondLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT21-019", as: "victim1" },
            { card: "BT1-010", as: "victim2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("globemon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: hostId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: hostId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(6);
  });

  it("fires Globemon's public When Linking deletion when linked onto another Appmon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "otherHost" }],
          hand: [{ card: "BT21-023", as: "globemon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-010", as: "upper" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("globemon").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("otherHost").linked.some((card) => card.instanceId === s.inst("globemon").instanceId)).toBe(true);
  });

  it("uses Globemon's printed 10000 DP ceiling on a public link while leaving a 12000 DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-023", as: "globemon" }],
          hand: [{ card: "BT21-018", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT21-019", as: "eligible" },
            { card: "BT21-028", as: "above" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("globemon").permanentId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT21-028");
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(12000);
  });

  it("performs two real security checks with printed Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-023", as: "globemon", linked: [{ card: "BT21-018", as: "link" }] }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("globemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("links only this Globemon's qualifying stack card, not another Digimon's stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-023", as: "globemon", under: [{ card: "BT21-018", as: "ownLink" }] },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT21-018", as: "otherLink" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("globemon"));
    await settle(() => s.perm("globemon").linked.length === 1);

    expect(s.perm("globemon").linked[0]?.instanceId).toBe(s.inst("ownLink").instanceId);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toContain(s.inst("otherLink").instanceId);
  });
});
