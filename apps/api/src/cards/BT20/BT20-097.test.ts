import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-097.js";
import "./index.js";
import "../ST2/ST2-16.js";
import "../BT17/BT17-065.js";
import "../BT17/BT17-067.js";

describe("BT20-097 The Apostle of Doom Descends!", () => {
  it("matches the catalog identity, printed clauses, and complete IR coverage", () => {
    expect(getCardDefinition("BT20-097")).toMatchObject({
      cardId: "BT20-097",
      nameEn: "The Apostle of Doom Descends!",
      colors: ["Purple", "Black"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["X Antibody", "X Program"],
      effectText: expect.stringContaining("[DexDorugoramon]"),
      securityEffectText:
        "[Security] You may play 1 [Dorumon] from your hand or trash without paying the cost. Then, add this card to the hand.",
    });
    const main = compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)!;
    expect(main).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          reduceCost: 4,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }],
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("makes Delay exact-name, source-scoped, and paid by the triggering stack", () => {
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["DexDorugoramon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { nameOrTrait: [{ tokens: ["DeathXmon"], match: "nameExact" }] },
              },
              from: ["trash"],
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "return",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    zone: "digivolutionCards",
                    hostFilter: { isTriggerSource: true },
                    nameOrTrait: [{ tokens: ["Dorumon"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dorumon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("naturally digivolves a battle-area Digimon into a qualifying trash card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-097", as: "option" },
            { card: "BT1-010", as: "discard" },
          ],
          battleArea: [
            { card: "BT20-047", as: "host" },
            { card: "BT20-087", as: "colorSource" },
            { card: "BT20-090", as: "purpleSource" },
          ],
          trash: [{ card: "BT17-065", as: "dexDorugamon" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT17-065");

    expect(s.perm("host").topCard.cardId).toBe("BT17-065");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-097");
    expect(s.state.memory).toBe(0);
  });

  it("does not digivolve into an over-level DeathX card, but still places the Option", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-097", as: "option" }],
          battleArea: [
            { card: "BT20-047", as: "host" },
            { card: "BT20-087", as: "colorSource" },
            { card: "BT20-090", as: "purpleSource" },
          ],
          trash: [{ card: "BT20-082", as: "overLevel" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097"));
    expect(s.perm("host").topCard.cardId).toBe("BT20-047");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-082")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("activates Delay on a natural public return from the battle area", async () => {
    const options = { autoAcceptOptional: false, autoDeclineOptional: false, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-073", as: "dexDorugoramon", under: ["BT20-048"] }],
          hand: [{ card: "BT20-097", as: "option" }],
          trash: [{ card: "BT20-082", as: "deathXmon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "colorSource" }],
          hand: [{ card: "ST2-16", as: "return" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      options,
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("return").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-082"),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-082")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT20-048")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-073")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not arm Delay for a breeding-area DexDorugoramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-087", as: "colorSource" },
            { card: "BT20-090", as: "purpleSource" },
          ],
          hand: [{ card: "BT20-097", as: "option" }],
          // Legal purple/black evolution stack: Dorumon -> DexDorugamon Lv.4 ->
          // DexDoruGreymon Lv.5 -> DexDorugoramon Lv.6.
          breeding: {
            card: "BT17-073",
            as: "breedingDex",
            under: ["BT20-048", "BT17-065", "BT17-067"],
          },
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "colorSource" }],
          hand: [{ card: "ST2-16", as: "return" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097"));
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT17-073");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097")).toBe(true);
  });

  it("public Security check plays Dorumon and returns this Option to hand, with refusal preserving Dorumon", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT20-048", as: "dorumon" }],
            deck: ["BT1-010", "BT1-010"],
            security: [{ card: "BT20-097", as: "securityOption" }, "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT20-010", as: "attacker" }],
            deck: ["BT1-010", "BT1-010"],
            security: ["BT1-010"],
          },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
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
      await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT20-097"));
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-097");
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-048")).toBe(accept);
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT20-048")).toBe(!accept);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("Delay refusal preserves the stacked Dorumon and DeathXmon in trash", async () => {
    const options = { autoAcceptOptional: false, autoDeclineOptional: false, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-073", as: "dex", under: ["BT20-048"] }],
          hand: [{ card: "BT20-097", as: "option" }],
          trash: [{ card: "BT20-082", as: "deathX" }],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", as: "colorSource" }],
          hand: [{ card: "ST2-16", as: "return" }],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010"],
        },
      },
      options,
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("return").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.trash.some((card) => card.cardId === "BT20-048"),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-082")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-082", "BT20-048"]),
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
