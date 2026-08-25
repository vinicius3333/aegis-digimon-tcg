import { describe, expect, it } from "vitest";
import { appFusionCostFor, EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-017.js";
import "../index.js";

const CARD_ID = "EX10-017";

describe("EX10-017 Mienumon", () => {
  it("records the exact catalog, App Fusion, keywords, self-linked watcher, and linked payoff", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Sup.", "Appmon"],
      attributes: ["System"],
      types: ["Stealth", "Leviathan"],
      linkDp: 3000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mirrormon", "Kabemon", "Copipemon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(
      compiled.effects
        .filter((effect) => effect.trigger === "Static")
        .flatMap((effect) => effect.keywords ?? [])
        .map(({ keyword }) => keyword),
    ).toEqual(["Jamming", "Retaliation"]);
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              optional: true,
              condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1 },
              target: { filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Leviathan"], match: "trait" }] } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Draw",
              amount: 1,
              optional: true,
              abortOnDecline: true,
              cost: { target: { filter: { zone: "linked", isSelfRef: true }, count: 1 } },
            },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    });
  });

  it("digivolves from both printed level-3 colors for exactly 3", async () => {
    for (const baseCard of ["EX10-016", "BT10-071"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: CARD_ID, as: "mienumon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("mienumon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
      expect([...s.perm("base").keywords]).toEqual(expect.arrayContaining(["Jamming", "Retaliation"]));
    }
  });

  it("Q5394 accepts all 6 distinct App Fusion pairs and performs a zero-cost fusion with a real stack", async () => {
    const names = ["Mirrormon", "Kabemon", "Copipemon"];
    for (const topName of names) {
      for (const linkedName of names) {
        expect(appFusionCostFor(CARD_ID, { topName, linkedNames: [linkedName] })).toBe(
          topName === linkedName ? undefined : 0,
        );
      }
    }

    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-016", as: "fuser", linked: [{ card: "EX10-024", as: "kabemon" }] }],
        hand: [{ card: CARD_ID, as: "mienumon" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 1;
    const result = await advance(s.engine).verb.appFuseInto(s.perm("fuser").permanentId, s.inst("mienumon").instanceId);

    expect(result?.topCard.cardId).toBe(CARD_ID);
    expect(result?.stack.map(({ cardId }) => cardId)).toContain("EX10-016");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("links only to Appmon for 2 and contributes +3000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "notAppmon" },
        ],
        hand: [{ card: CARD_ID, as: "mienumon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const baseDp = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mienumon").instanceId,
        targetPermanentId: s.perm("notAppmon").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mienumon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(baseDp + 3000);
  });

  it("plays only a Leviathan Tamer when this Digimon gets linked with 1 or fewer Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "mienumon" },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT24-053", as: "ownLink" },
            { card: "BT24-053", as: "neighborLink" },
            { card: "EX10-062", as: "yujin" },
            { card: "BT1-085", as: "wrongTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("neighborLink").instanceId,
        targetPermanentId: s.perm("neighbor").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("neighbor").linked.length === 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yujin").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("ownLink").instanceId,
        targetPermanentId: s.perm("mienumon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("yujin").instanceId),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("wrongTamer").instanceId);
  });

  it("does not play the Tamer with 2 Tamers in play and may refuse at the 1-Tamer boundary", async () => {
    for (const mode of ["tooMany", "declined"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: CARD_ID, as: "mienumon" },
              ...(mode === "tooMany" ? [{ card: "BT1-085" }, { card: "BT1-085" }] : [{ card: "BT1-085" }]),
            ],
            hand: [
              { card: "BT24-053", as: "link" },
              { card: "EX10-062", as: "yujin" },
            ],
          },
        },
        mode === "declined" ? { autoDeclineOptional: true } : { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst("link").instanceId,
          targetPermanentId: s.perm("mienumon").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("mienumon").linked.length === 1);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yujin").instanceId);
    }
  });

  it("Q5048 trashes itself after an opposing Digimon suspends, then draws 1 and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "mienumon" }] }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mienumon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("Q5049 trashes another card on the same legal Link +1 host and may refuse without payoff", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              linked: [
                { card: CARD_ID, as: "mienumon" },
                { card: "BT26-010", as: "otherLink" },
              ],
            },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("otherLink").instanceId);
    (
      accepted.engine as unknown as {
        continuous: {
          addLinkMaxGrant(permanentId: string, delta: number, duration: EffectDuration): void;
        };
      }
    ).continuous.addLinkMaxGrant(accepted.perm("host").permanentId, 1, EffectDuration.UntilEachTurnEnd);
    await accepted.ready();
    await advance(accepted.engine).verb.suspend([accepted.perm("opponent").permanentId], 0);
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("mienumon").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("otherLink").instanceId,
    );
    expect(accepted.state.memory).toBe(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "mienumon" }] }],
          deck: [{ card: "BT1-001", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 0;
    await declined.ready();
    await advance(declined.engine).verb.suspend([declined.perm("opponent").permanentId], 0);
    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.state.players[0]!.hand).toHaveLength(0);
    expect(declined.state.memory).toBe(0);
  });
});
