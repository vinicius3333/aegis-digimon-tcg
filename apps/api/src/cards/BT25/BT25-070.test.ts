import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_070 } from "./BT25-070.js";

describe("BT25-070 Logamon", () => {
  it("matches the complete catalog, App Fusion, evolution, link, and printed effect contract", () => {
    expect(getCardDefinition("BT25-070")).toMatchObject({
      nameEn: "Logamon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Sup.", "Appmon"],
      attributes: ["Social"],
      types: ["Logoff"],
      linkDp: 3000,
      linkRequirement: "[Link] [Appmon] trait: Cost 2",
      linkEffect: "[When Linking] 1 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.",
      dualEffect: "Logamon",
    });
    expect(BT25_070.appFusionRequirement).toEqual([{ names: ["Offmon", "Hackmon"], cost: 0 }]);
    expect(BT25_070.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
  });

  it("maps the once-per-turn Link and self-link deletion clauses exactly", () => {
    const main = BT25_070.effects?.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Link",
      from: ["trash", "digivolutionCards"],
      costDelta: -1,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          hasLinkRequirement: true,
          hostFilter: { isSelfRef: true },
          nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
        },
        count: 1,
      },
    });
    const yourTurn = BT25_070.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    const linkedTrigger = yourTurn!.actions[0]!;
    expect(linkedTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      on: { filter: { isSelfRef: true } },
    });
    expect((linkedTrigger as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
    });
  });

  it("links a valid Social Digimon from trash for zero net cost and deletes only play-cost 4 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon" }],
          trash: [
            { card: "BT21-009", as: "link" },
            { card: "BT21-041", as: "secondLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT25-079", as: "cheap" },
            { card: "BT25-081", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("logamon"));

    expect(s.perm("logamon").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondLink").instanceId);
    expect(s.state.memory).toBe(1); // printed Link cost 1 reduced by 1
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT25-081"]);

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("logamon"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondLink").instanceId);
  });

  it("naturally activates the Main link effect through the public effect surface", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon" }],
          trash: [{ card: "BT21-009", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT25-079", as: "cheap" },
            { card: "BT25-081", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("logamon")) as { effectKey: string }[];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("logamon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("logamon").linked.some((card) => card.instanceId === s.inst("link").instanceId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-079"),
    );

    expect(s.perm("logamon").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT25-081"]);
  });

  it("allows a public Main-link refusal without changing the candidate, cost, or once-per-turn opportunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon" }],
          trash: [{ card: "BT25-061", as: "candidate" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const beforeTrash = s.state.players[0]!.trash.map((card) => card.instanceId);
    const beforeLinked = s.perm("logamon").linked.map((card) => card.instanceId);
    const [effect] = observe(s.engine).activatableEffects(s.perm("logamon")) as { effectKey: string }[];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("logamon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(beforeTrash);
    expect(s.perm("logamon").linked.map((card) => card.instanceId)).toEqual(beforeLinked);
    expect(observe(s.engine).activatableEffects(s.perm("logamon"))).toHaveLength(0);
  });

  it("accepts a valid Link card from this Logamon's stack, but never another Digimon's stack", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon", under: [{ card: "BT25-061", as: "stackLink" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await valid.ready();
    await advance(valid.engine).fire(EffectTiming.OnDeclaration, valid.perm("logamon"));
    expect(valid.perm("logamon").linked.map((card) => card.instanceId)).toContain(valid.inst("stackLink").instanceId);
    expect(valid.perm("logamon").stack).toHaveLength(0);

    const wrongHost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-070", as: "logamon" },
            {
              card: "BT25-071",
              as: "other",
              under: [{ card: "BT25-066", as: "wrongStack" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await wrongHost.ready();
    await advance(wrongHost.engine).fire(EffectTiming.OnDeclaration, wrongHost.perm("logamon"));
    expect(wrongHost.perm("logamon").linked).toHaveLength(0);
    expect(wrongHost.perm("other").stack.map((card) => card.cardId)).toEqual(["BT25-066"]);
  });

  it.each([
    ["black", "BT25-062"],
    ["purple", "BT24-009"],
  ] as const)("publicly ordinary-digivolves from a legal %s level-3 source for 3", async (_color, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "source" }], hand: [{ card: "BT25-070", as: "logamon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("logamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-070");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([source]);
  });

  it("rejects the wrong-color level-3 source without moving or charging it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "redSource" }], hand: [{ card: "BT25-070", as: "logamon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redSource").permanentId,
        instanceId: s.inst("logamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redSource").topCard.cardId).toBe("BT21-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("logamon").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("publicly App Fuses Offmon and Hackmon into Logamon at zero cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-061", as: "offmon", linked: [{ card: "BT24-067", as: "hackmon" }] }],
        hand: [{ card: "BT25-070", as: "logamon" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("offmon").permanentId,
        instanceId: s.inst("logamon").instanceId,
        appFusionLinkInstanceId: s.inst("hackmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("offmon").topCard.cardId === "BT25-070");
    expect(s.perm("offmon").stack.map((card) => card.cardId)).toEqual(["BT25-061", "BT24-067"]);
    expect(s.perm("offmon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("logamon").instanceId);
  });

  it("rejects a trait-looking card without its own Link requirement (Q6367)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon" }],
          trash: [{ card: "BT21-005", as: "noLink" }], // Social attribute, but a Digi-Egg with no <Link>
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("logamon"));
    expect(s.perm("logamon").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("applies Logamon's printed When Linking unsuspend restriction to one opposing Digimon or Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT25-070", as: "logamonLink" }],
        },
        1: {
          battleArea: [
            { card: "BT25-081", as: "opponentDigimon" },
            { card: "BT1-087", as: "otherTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("logamonLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.cardId === "BT25-070") &&
        observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend"),
    );

    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["BT25-070"]);
    expect(s.state.memory).toBe(0); // printed Link cost 2
    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("otherTamer"), "unsuspend")).toBe(false);
  });

  it("keeps the linked unsuspend restriction through the opponent turn and expires at its end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT25-070", as: "logamonLink" }],
        },
        1: { battleArea: [{ card: "BT25-081", as: "opponentDigimon", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("logamonLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.cardId === "BT25-070") &&
        observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend"),
    );
    expect(s.perm("opponentDigimon").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("opponentDigimon").permanentId]);
    expect(s.perm("opponentDigimon").isSuspended).toBe(false);
  });
});
