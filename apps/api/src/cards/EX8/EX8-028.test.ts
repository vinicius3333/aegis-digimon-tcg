import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-028.js";

describe("EX8-028", () => {
  it("matches the complete printed catalog identity and text", () => {
    const card = getCardDefinition("EX8-028");
    expect(card).toMatchObject({
      cardId: "EX8-028",
      nameEn: "Skadimon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Ice-Snow", "LIBERATOR"],
    });
    expect(card?.effectText).toContain("＜Ice Clad＞");
    expect(card?.effectText).toContain("＜Barrier＞");
    expect(card?.effectText).toContain("[When Digivolving] You may play 1 level 4 or lower [Ice-Snow]");
    expect(card?.effectText).toContain("For each of your opponent's Digimon with no digivolution cards");
    expect(card?.effectText).toContain("[When Digivolving] [When Attacking] [Once Per Turn]");
    expect(card?.effectText).toContain("bottom security card");
  });
  it("has Ice Clad and Barrier and plays an Ice-Snow Digimon from hand when digivolving", () => {
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "IceClad", raw: "＜Ice Clad＞" },
        { keyword: "Barrier", raw: "＜Barrier＞" },
      ]),
    );
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "CostModifier",
      mode: "raiseCeiling",
      costType: "level",
      amount: 1,
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
      },
    });
    expect(actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
        },
      },
    });
    expect(digivolutionRequirementsFor("EX8-028")).toContainEqual({
      level: 5,
      traits: ["Ice-Snow"],
      cost: 3,
      isAlternate: true,
    });
  });
  it("has once-per-turn self-unsuspend effects when digivolving and attacking", () => {
    const digivolving = compiled.effects?.find(
      (entry) => entry.trigger === "WhenDigivolving" && entry.frequency === "OncePerTurn",
    );
    expect(digivolving).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(digivolving?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      cost: {
        kind: "place",
        targetIsPermanent: true,
        destination: "security",
        position: "bottom",
        faceDown: true,
        target: {
          count: 1,
          filter: { controllerDefault: "any", kind: ["Digimon"], digivolutionCards: "none" },
        },
      },
      abortOnDecline: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [{ kind: "Unsuspend", optional: true, abortOnDecline: true }],
    });
  });

  it("exposes Ice Clad and Barrier on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-028", as: "skadimon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("skadimon"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skadimon"), "Barrier")).toBe(true);
  });

  it("uses Ice Clad source count to win a lower-DP battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-028", as: "skadimon", dp: 1000, under: ["EX8-023"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 15000, suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const opponentId = s.perm("opponent").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skadimon").permanentId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses Barrier to pay security and prevent battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-028", as: "skadimon" }], security: ["BT1-009"] },
    });
    await s.ready();
    const skadimonId = s.perm("skadimon").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([skadimonId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: skadimonId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("deletes in battle when the optional Barrier payment is declined", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-028", as: "skadimon" }], security: ["BT1-009"] },
    });
    await s.ready();
    const skadimonId = s.perm("skadimon").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([skadimonId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: skadimonId, accept: false })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("raises the level ceiling per source-less opponent and plays a level 5 Ice-Snow card", async () => {
    expect(digivolutionRequirementsFor("EX8-028")).toContainEqual({
      level: 5,
      traits: ["Ice-Snow"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-023", as: "polar" }],
          hand: [
            { card: "EX8-028", as: "skadimon" },
            { card: "EX8-023", as: "level5" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "bare" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("polar").permanentId,
        instanceId: s.inst("skadimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("level5").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });

  it("keeps the optional Ice-Snow play declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-023", as: "polar" }],
          hand: [
            { card: "EX8-028", as: "skadimon" },
            { card: "EX8-019", as: "penguin" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "sourceLess" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("polar").permanentId,
        instanceId: s.inst("skadimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("polar").topCard.cardId === "EX8-028");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("penguin").instanceId)).toBe(true);
  });

  it("uses the standard Blue level-5 evolution route for 4 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-023", as: "polar" }], hand: [{ card: "EX8-028", as: "skadimon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("polar").permanentId,
        instanceId: s.inst("skadimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("polar").topCard.cardId === "EX8-028");
    expect(s.state.memory).toBe(0);
    expect(s.perm("polar").stack.map((card) => card.cardId)).toEqual(["EX8-023"]);
  });

  it("uses the Once Per Turn limit for repeated When Attacking activations", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-028", as: "skadimon" },
            { card: "BT1-009", as: "firstSource" },
            { card: "EX8-017", as: "secondSource" },
          ],
          deck: ["BT1-010", "BT1-013"],
        },
        1: { security: 3, deck: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("firstSource").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skadimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skadimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("secondSource").instanceId,
      ),
    ).toBe(true);
  });

  it.each([["own", 0] as const, ["opponent", 1] as const])(
    "may place an %s source-less Digimon as bottom security and unsuspend (Q3897)",
    async (alias, seat) => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX8-028", as: "skadimon", suspended: true },
              { card: "EX8-017", as: "own" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      preferInstanceIds.push(s.perm(alias).permanentId);
      const cardId = s.perm(alias).topCard.instanceId;

      await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("skadimon"));

      expect(s.perm("skadimon").isSuspended).toBe(false);
      expect(s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard.instanceId === cardId)).toBe(
        false,
      );
      expect(s.state.players[seat]!.security.some((card) => card.instanceId === cardId)).toBe(true);
      expect(s.state.players[seat]!.security.at(-1)!.instanceId).toBe(cardId);
    },
  );

  it("keeps the When Attacking security placement optional when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-028", as: "skadimon" },
            { card: "EX8-017", as: "other" },
          ],
        },
        1: { security: 1 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skadimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("skadimon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-017")).toBe(true);
  });

  it("does not count an opponent with sources toward the level ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-023", as: "polar" }],
          hand: [
            { card: "EX8-028", as: "skadimon" },
            { card: "EX8-028", as: "level6" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "sourceLess" },
            { card: "BT1-024", as: "withSources", under: ["BT1-016"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("polar").permanentId,
        instanceId: s.inst("skadimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("polar").topCard.cardId === "EX8-028");

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-028")).toBe(true);
  });
});
