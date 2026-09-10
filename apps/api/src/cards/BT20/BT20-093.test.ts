import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT20-093.js";
import "./index.js";
import "../ST2/ST2-16.js";
import "../EX3/EX3-074.js";

const DECK_FILLER = ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"];

describe("BT20-093 Unleash the Dragon Gene", () => {
  it("matches the catalog and keeps the optional reduced play and mandatory placement sequence", () => {
    expect(getCardDefinition("BT20-093")).toMatchObject({
      cardId: "BT20-093",
      nameEn: "Unleash the Dragon Gene",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Option"],
      effectText: expect.stringContaining("Dracomon"),
      securityEffectText: expect.stringContaining("in its name"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: true,
          reduceCostBy: 3,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
            },
            count: 1,
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Dracomon"], match: "name" }] },
            count: 1,
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("resolves reactive Delay DNA before the qualifying Digimon leaves", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              payCost: true,
              optional: true,
              materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Examon"], match: "nameExact" }],
                zone: "hand",
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).not.toHaveProperty(
      "mode",
      "prevent",
    );
  });

  it("naturally plays Dracomon- and Examon-text Digimon at the reduced cost, then places itself", async () => {
    for (const [candidate, memory] of [
      ["BT20-023", 4],
      ["EX3-074", 14],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-009", as: "redSource" },
              { card: "BT1-027", as: "blueSource" },
            ],
            hand: [
              { card: "BT20-093", as: "option" },
              { card: candidate, as: "candidate" },
            ],
            deck: DECK_FILLER,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = memory;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-093"));

      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
        expect.arrayContaining([candidate, "BT20-093"]),
      );
      const printedPlayCost = getCardDefinition(candidate)?.playCost;
      if (printedPlayCost === undefined) throw new Error(`catalog play cost missing for ${candidate}`);
      expect(printedPlayCost).toBe(candidate === "BT20-023" ? 5 : 15);
      const memoryEvents = s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "playCard");
      expect(memoryEvents).toHaveLength(2);
      const candidatePlay = memoryEvents[1];
      if (candidatePlay?.kind !== "memoryChanged") throw new Error("candidate play did not emit memory change");
      expect(candidatePlay.to - candidatePlay.from).toBe(-(printedPlayCost - 3));
      expect(s.events.some((event) => event.kind === "memoryChanged" && event.reason === "payCost")).toBe(true);
      // The observable gauge also includes card-resolution adjustments; the ordered
      // play-card cost deltas are the payment evidence for the Option and candidate.
    }
  });

  it("public Security plays a Dracomon-name card from hand or trash for free", async () => {
    for (const zone of ["hand", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            security: [{ card: "BT20-093", as: "option" }],
            ...(zone === "hand"
              ? { hand: [{ card: "BT20-007", as: "dracomon" }] }
              : { trash: [{ card: "BT20-007", as: "dracomon" }] }),
            deck: DECK_FILLER,
          },
          1: { battleArea: [{ card: "BT20-047", as: "attacker" }], deck: DECK_FILLER },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const optionId = s.inst("option").instanceId;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-007")).toBe(true);
      expect(s.state.players[0]!.security).toHaveLength(0);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }

    const nearName = setupEngine(
      {
        0: {
          security: [{ card: "BT20-093", as: "option" }],
          hand: [{ card: "BT20-023", as: "coredramon" }],
          deck: DECK_FILLER,
        },
        1: { battleArea: [{ card: "BT20-047", as: "attacker" }], deck: DECK_FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = nearName.inst("option").instanceId;
    await nearName.ready();
    const loop = nearName.engine.startTurnLoop();
    await advance(nearName.engine).waitForMainPhase(0);
    advance(nearName.engine).endMainPhaseIfOpen(0);
    await advance(nearName.engine).waitForMainPhase(1);
    expect(
      nearName.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: nearName.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      nearName.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId),
    );
    expect(nearName.state.players[0]!.hand.some((card) => card.cardId === "BT20-023")).toBe(true);
    expect(nearName.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-093")).toBe(
      true,
    );
    expect(nearName.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each(["accept", "decline"] as const)(
    "resolves printed reactive Delay on %s through a public departure",
    async (route) => {
      const preferred: string[] = [];
      const options = {
        autoAcceptOptional: false,
        autoDeclineOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      };
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-027", suspended: true, as: "slayer" },
              { card: "BT20-044", as: "breaker" },
            ],
            hand: [
              { card: "BT20-093", as: "option" },
              { card: "EX3-074", as: "examon" },
            ],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT1-027", dp: 16000, as: "opponent" }],
            hand: [{ card: "ST2-16", as: "return" }],
            deck: ["BT1-010", "BT1-010"],
          },
        },
        options,
      );
      const optionId = s.inst("option").instanceId;
      const slayerId = s.perm("slayer").permanentId;
      const slayerCardId = s.perm("slayer").topCard.instanceId;
      preferred.push(slayerId, slayerCardId);
      s.state.memory = 10;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX3-074")).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      s.state.memory = 7;
      options.autoDeclineOptional = route === "decline";
      options.autoAcceptOptional = route !== "decline";
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("return").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST2-16"));
      const examon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX3-074");
      const accepted = route === "accept";
      expect(examon !== undefined).toBe(accepted);
      expect(examon?.stack.map((card) => card.cardId).sort() ?? []).toEqual(accepted ? ["BT20-027", "BT20-044"] : []);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(accepted);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === slayerCardId)).toBe(!accepted);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(
        !accepted,
      );
      expect(s.state.memory).toBe(0);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("does not arm Delay when a qualifying suspended Digimon leaves through battle", async () => {
    const options = { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-027", as: "slayer" },
            { card: "BT20-044", as: "breaker" },
          ],
          hand: [
            { card: "BT20-093", as: "option" },
            { card: "EX3-074", as: "examon" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", dp: 16000, as: "opponent" }],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      options,
    );
    const optionId = s.inst("option").instanceId;
    const slayer = s.perm("slayer");
    const slayerId = slayer.permanentId;
    const slayerCardId = slayer.topCard.instanceId;
    const breakerId = s.perm("breaker").permanentId;
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX3-074")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breakerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // A player-directed, unblocked attack resolves through a security check rather than
    // `combatResolved` (that event only fires for a resolved Digimon-vs-Digimon battle).
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.perm("breaker").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: slayerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === slayerId)?.isSuspended).toBe(
      true,
    );
    advance(s.engine).endMainPhaseIfOpen(0);

    options.autoAcceptOptional = true;
    options.autoDeclineOptional = false;
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "permanent", permanentId: slayerId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === slayerCardId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === slayerCardId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === breakerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX3-074")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declines the optional Main play for a nonmatching Digimon and still places the Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT20-093", as: "option" },
            { card: "BT20-010", as: "nonmatching" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-093"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonmatching").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
