import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT13/BT13-053.js";
import { compiled } from "./BT9-106.js";
import "./BT9-106.js";

describe("BT9-106 DeathXDigivolution!", () => {
  it("matches catalog values and waiver, legal trash evolution, and security IR", () => {
    expect(getCardDefinition("BT9-106")).toMatchObject({
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 0,
      types: ["X Antibody"],
      securityEffectText: "[Security] Add this card to its owner's hand.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Static",
          actions: [
            {
              kind: "WaiveColorRequirement",
              condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } },
            },
          ],
        },
        {
          trigger: "Main",
          actions: [
            {
              kind: "Digivolve",
              from: ["trash"],
              payCost: true,
              into: {
                nameOrTrait: [
                  { tokens: ["Dex"], match: "name" },
                  { tokens: ["DeathX"], match: "name" },
                ],
              },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
      ],
    });
  });

  it("offers only legal bases and pays the chosen Dex card's digivolution cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-070", as: "chosenBase" },
          { card: "BT9-071", as: "otherLegalBase" },
          { card: "BT9-062", as: "wrongLevel" },
        ],
        hand: [{ card: "BT9-106", as: "option" }],
        trash: [{ card: "BT9-075", as: "dexEvolution" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const baseChoice = s.decisions.at(-1)!.req;
    expect(baseChoice.sourceCardId).toBe("BT9-106");
    expect(baseChoice.options).toMatchObject({ min: 1, max: 1 });
    expect(baseChoice.options?.candidateInstanceIds).toEqual([
      s.perm("chosenBase").permanentId,
      s.perm("otherLegalBase").permanentId,
    ]);
    expect(baseChoice.options?.candidateInstanceIds).not.toContain(s.perm("wrongLevel").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: baseChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosenBase").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosenBase").topCard.instanceId === s.inst("dexEvolution").instanceId);

    expect(s.perm("chosenBase").topCard.cardId).toBe("BT9-075");
    expect(s.perm("otherLegalBase").topCard.cardId).toBe("BT9-071");
    expect(s.perm("wrongLevel").topCard.cardId).toBe("BT9-062");
    expect(s.state.memory).toBe(2);
  });

  it("uses the purple Option with only a black X Antibody Digimon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-062", as: "blackX" }],
        hand: [{ card: "BT9-106", as: "option" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: optionId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });

  it("does not waive the color requirement without an own X Antibody Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redDigimon" }],
        hand: [{ card: "BT9-106", as: "option" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("adds itself to its owner's hand from Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT9-106", as: "option", faceUp: true }] },
    });
    const optionId = s.inst("option").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.security.some(({ instanceId }) => instanceId === optionId)).toBe(false);
  });
});

describe("BT9-106 DeathXDigivolution! — KB Q&A rulings", () => {
  it("digivolves only into a Dex/DeathX card whose digivolution requirements the Digimon meets (Q1913)", async () => {
    const useOption = async (legalDexInTrash: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT9-062", as: "raptordramon" }],
            hand: [{ card: "BT9-106", as: "option" }],
            trash: [
              { card: "BT9-075", as: "levelFourDex" },
              { card: "BT9-081", as: "levelSixDex" },
              { card: "BT9-112", as: "deathXmon" },
              ...(legalDexInTrash
                ? [
                    { card: "BT9-078", as: "levelFiveDex" },
                    { card: "BT9-078", as: "otherLevelFiveDex" },
                  ]
                : []),
            ],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
      );
      return s;
    };

    const offeredIds = (s: Awaited<ReturnType<typeof useOption>>) =>
      s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    const offeredIllegalIds = (s: Awaited<ReturnType<typeof useOption>>) => {
      const illegal = ["levelFourDex", "levelSixDex", "deathXmon"].map((alias) => s.inst(alias).instanceId);
      return offeredIds(s).filter((id) => illegal.includes(id));
    };

    const onlyIllegal = await useOption(false);
    expect(offeredIllegalIds(onlyIllegal)).toEqual([]);
    expect(onlyIllegal.perm("raptordramon").topCard.cardId).toBe("BT9-062");
    expect(onlyIllegal.state.memory).toBe(5);
    expect(onlyIllegal.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT9-075", "BT9-081", "BT9-112"]),
    );

    const withLegal = await useOption(true);
    expect(offeredIds(withLegal)).toEqual(
      expect.arrayContaining([
        withLegal.inst("levelFiveDex").instanceId,
        withLegal.inst("otherLevelFiveDex").instanceId,
      ]),
    );
    expect(offeredIllegalIds(withLegal)).toEqual([]);
    expect(withLegal.perm("raptordramon").topCard.cardId).toBe("BT9-078");
    expect(withLegal.state.memory).toBe(1);
  });

  it("applies a digivolution cost reduction when digivolving with this effect (Q1914)", async () => {
    const digivolveFromTrash = async (withReducer: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT9-078",
                as: "base",
                under: withReducer ? [{ card: "BT13-053", as: "mihiramon" }] : [],
              },
            ],
            hand: [{ card: "BT9-106", as: "option" }],
            trash: [{ card: "BT9-081", as: "dexEvolution" }],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
      );
      s.state.memory = 6;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.perm("base").topCard.instanceId === s.inst("dexEvolution").instanceId,
      );
      return s;
    };

    const reduced = await digivolveFromTrash(true);
    expect(reduced.perm("base").topCard.cardId).toBe("BT9-081");
    expect(reduced.state.memory).toBe(2);

    const unreduced = await digivolveFromTrash(false);
    expect(unreduced.perm("base").topCard.cardId).toBe("BT9-081");
    expect(unreduced.state.memory).toBe(1);
  });
});
