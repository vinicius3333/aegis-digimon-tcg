import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_067 } from "./BT24-067.js";
import "../index.js";

describe("BT24-067 Hackmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-067")).toMatchObject({
      cardId: "BT24-067",
      nameEn: "Hackmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Stnd.", "Appmon"],
      attributes: ["System"],
      types: ["Hacking"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
    });
  });

  it("limits the linked Rei Katsura play to one or fewer Tamers", () => {
    const watcher = BT24_067.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(watcher).toMatchObject({ event: "whenLinked", sourceFilter: { isSelfRef: true } });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { nameOrTrait: [{ tokens: ["Rei Katsura"], match: "nameExact" }] } },
      condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      optional: true,
    });
  });

  it.each([
    ["normal purple level-2 requirement", "BT10-006", false],
    ["alternate Appmon level-2 requirement", "BT21-005", true],
  ])("uses the %s for cost 0", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-067", as: "hackmon" }],
        deck: [{ card: "BT1-015", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hackmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("hackmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("hackmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it.each([false, true])("rejects the blue Digi-Egg for %s evolution route", async (useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "invalidEgg" },
        hand: [{ card: "BT24-067", as: "hackmon" }],
        deck: [{ card: "BT1-015", as: "inert" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const beforeHand = s.state.players[0]!.hand.map((card) => card.instanceId);
    const beforeTop = s.perm("invalidEgg").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidEgg").permanentId,
        instanceId: s.inst("hackmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.perm("invalidEgg").topCard.instanceId).toBe(beforeTop);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeHand);
  });

  it("models its cost-1 Appmon link and linked Retaliation", () => {
    expect(BT24_067.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(BT24_067.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("links for cost 1, adds 2000 DP, and grants Retaliation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT24-067", as: "hackmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("hackmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("hackmon").instanceId));
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Retaliation"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("publicly proves linked Retaliation in a battle against a higher-DP opponent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "gatchmon" }],
        hand: [{ card: "BT24-067", as: "hackmon" }],
      },
      1: { battleArea: [{ card: "BT1-020", as: "opponent", suspended: true, dp: 6000 }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("gatchmon").permanentId;
    const opponentId = s.perm("opponent").permanentId;
    const hackmonId = s.inst("hackmon").instanceId;
    expect(s.engine.applyIntent(0, { type: "linkCard", instanceId: hackmonId, targetPermanentId: hostId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gatchmon").linked.some((card) => card.instanceId === hackmonId));
    expect(s.perm("gatchmon").currentDP).toBe(4000);
    expect(observe(s.engine).hasKeyword(s.perm("gatchmon"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("gatchmon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hackmonId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponent").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });

  it("rejects linking Hackmon to a non-Appmon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "BT24-067", as: "hackmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const beforeHand = s.state.players[0]!.hand.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("hackmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeHand);
    expect(s.perm("host").linked.length).toBe(0);
  });

  it("plays exact Rei Katsura when this Hackmon gets linked with at most one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "hackmon" }],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT1-009", as: "wrong" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("hackmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    );

    expect(s.state.memory).toBe(2);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("rei").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrong").instanceId);
  });

  it("does not play Rei when a neighboring Appmon gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-067", as: "hackmon" },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("neighbor").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("neighbor").linked.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rei").instanceId);
  });

  it("publicly refuses the optional Rei play while retaining the source link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "hackmon" }],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const linkId = s.inst("link").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkId,
        targetPermanentId: s.perm("hackmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hackmon").linked.some((card) => card.instanceId === linkId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rei").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    ).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("suppresses a second same-turn link trigger and resets on the next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "hackmon" }],
          hand: [
            { card: "BT24-053", as: "linkA" },
            { card: "BT21-009", as: "linkB" },
            { card: "BT24-038", as: "linkC" },
            { card: "BT24-053", as: "linkD" },
            { card: "BT24-087", as: "rei1" },
            { card: "BT24-087", as: "rei2" },
            { card: "BT24-087", as: "rei3" },
          ],
          deck: ["BT1-015", "BT1-016", "BT1-017"],
        },
        1: { deck: ["BT1-015", "BT1-016", "BT1-017"] },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const hackmonId = s.perm("hackmon").permanentId;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkA").instanceId,
        targetPermanentId: hackmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const firstReiDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstReiDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const firstReiCardDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstReiCardDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("rei1").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei1").instanceId),
    );
    expect(s.state.memory).toBe(9);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkB").instanceId,
        targetPermanentId: hackmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const reiWatcherDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: reiWatcherDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hackmon").linked.some((card) => card.instanceId === s.inst("linkB").instanceId));
    expect(s.state.memory).toBe(8);
    expect(s.perm("hackmon").linked.map((card) => card.instanceId)).toEqual([s.inst("linkB").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("linkA").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("linkC").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rei2").instanceId);
    expect(s.state.players[0]!.hand.find((card) => card.instanceId === s.inst("rei2").instanceId)?.cardId).toBe(
      "BT24-087",
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkD").instanceId,
        targetPermanentId: hackmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const resetReiOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: resetReiOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const resetReiCard = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: resetReiCard.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("rei2").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei2").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei2").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(9);
    const resetWatcher = s.state.pendingDecision!;
    expect(resetWatcher.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: resetWatcher.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.perm("hackmon").linked.length === 1);
    expect(s.perm("hackmon").linked.map((card) => card.instanceId)).toEqual([s.inst("linkD").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("linkB").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("plays Rei with exactly one neutral Tamer on the field", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-067", as: "hackmon" },
            { card: "BT1-085", as: "neutralTamer" },
          ],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("hackmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    );
    expect(s.state.memory).toBe(2);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("rei").instanceId);
    expect(s.perm("hackmon").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
  });

  it("does not play Rei when two Tamers are already on the field", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-067", as: "hackmon" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT24-087", as: "rei" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("hackmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hackmon").linked.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("rei").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rei").instanceId)).toBe(false);
    expect(s.state.memory).toBe(2);
  });
});
