import { describe, expect, it } from "vitest";
import { appFusionCostFor, EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
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
          deck: ["BT1-013"],
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
        deck: [{ card: "BT1-013", as: "drawn" }],
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
    // Both links cost 1 each from the starting 2; EX10-062's play cost of 3 was never paid.
    expect(s.state.memory).toBe(0);
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

  it("Q5048 trashes itself when an opposing Blocker suspends on our turn, then draws 1 and gains 1 memory", async () => {
    // [All Turns], our half: the opponent's Blocker suspends to block, a public
    // `declareBlock` intent, so no injected timing is involved.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "mienumon" }] }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mienumon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
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
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("otherLink").instanceId);
    await accepted.ready();
    await advance(accepted.engine).verb.grantLinkMax(
      accepted.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
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
          deck: [{ card: "BT1-013", as: "top" }],
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

  it("[All Turns] link payoff fires through a real opponent attack, not injected timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "mienumon" }] }],
          deck: [{ card: "BT1-013", as: "drawn" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: ["BT1-009", "BT1-010"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;
    const handBefore = p0.hand.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    // The attacker suspended to declare the attack: that public suspension, not
    // `advance.verb.suspend`, is what armed the linked clause.
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mienumon").instanceId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    // The card arrived during the opponent's turn, so it is the effect's draw and not
    // any draw step of our own turn.
    expect(p0.hand).toHaveLength(handBefore + 1);
    expect(s.state.memory).not.toBe(memoryBefore);
    const memoryAfterFirst = s.state.memory;

    // No [Once Per Turn] on the linked clause, but the only copy is now in the trash,
    // so a second opponent suspension in the same turn cannot pay the cost again.
    await advance(s.engine).verb.suspend([s.perm("attacker").permanentId], 1);
    expect(p0.trash.filter(({ cardId }) => cardId === CARD_ID)).toHaveLength(1);
    expect(s.state.memory).toBe(memoryAfterFirst);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire the linked clause while this card sits in the battle area unlinked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mienumon" }],
          deck: [{ card: "BT1-013", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const p0 = s.state.players[0]!;
    const handBefore = p0.hand.length;
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);

    expect(p0.hand).toHaveLength(handBefore);
    expect(p0.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("mienumon").topCard.cardId).toBe(CARD_ID);
  });

  it("[Once Per Turn]: a second link in the same turn plays no Tamer, and the next own turn resets it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mienumon" }],
          hand: [
            { card: "BT24-053", as: "linkA" },
            { card: "BT24-053", as: "linkB" },
            { card: "BT24-053", as: "linkC" },
            { card: "EX10-062", as: "yujinA" },
            { card: "EX10-062", as: "yujinB" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.grantLinkMax(s.perm("mienumon").permanentId, 2, EffectDuration.Permanent);
    const p0 = s.state.players[0]!;
    const inPlay = () => p0.battleArea.map(({ topCard }) => topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkA").instanceId,
        targetPermanentId: s.perm("mienumon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => inPlay().includes(s.inst("yujinA").instanceId));
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yujinB").instanceId);

    // Same turn, second link: the condition still holds (1 Tamer is "1 or fewer"),
    // so only the [Once Per Turn] gate can stop the second play.
    expect(p0.battleArea.filter(({ topCard }) => topCard.cardId === "EX10-062")).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkB").instanceId,
        targetPermanentId: s.perm("mienumon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mienumon").linked.length === 2);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yujinB").instanceId);
    expect(p0.battleArea.filter(({ topCard }) => topCard.cardId === "EX10-062")).toHaveLength(1);

    // Real turn loop to the opponent's turn and back to ours resets the gate.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkC").instanceId,
        targetPermanentId: s.perm("mienumon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => inPlay().includes(s.inst("yujinB").instanceId));
    expect(p0.battleArea.filter(({ topCard }) => topCard.cardId === "EX10-062")).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Retaliation＞ deletes the attacker that deletes this Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "mienumon" }], security: ["BT1-009"], deck: ["BT1-010"] },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
        deck: ["BT1-009", "BT1-011"],
        security: ["BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mienumon").permanentId, "Retaliation")).toBe(true);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Suspend it through a public attack, so the opponent has a legal target next turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mienumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("mienumon").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("mienumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-013");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Jamming＞ keeps this Digimon alive against a larger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "mienumon" }], deck: ["BT1-009"] },
      1: { security: [{ card: "BT1-024", as: "guard" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mienumon").permanentId, "Jamming")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mienumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    // 6000 DP loses to the 10000 DP security Digimon, but ＜Jamming＞ (§16-9) keeps it alive.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
  });
});
