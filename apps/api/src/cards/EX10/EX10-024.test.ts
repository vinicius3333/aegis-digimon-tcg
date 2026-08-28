import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./EX10-024.js";
import "../index.js";

const CARD_ID = "EX10-024";

describe("EX10-024 Kabemon compiled contract", () => {
  it("records linked De-Digivolve, Security play, and both requirements", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isLinked: true,
          actions: [
            expect.objectContaining({
              kind: "DeDigivolve",
              amount: 1,
              cost: expect.objectContaining({
                kind: "trash",
                target: { filter: { controller: "mine", zone: "linked", isSelfRef: true }, count: 1 },
              }),
              optional: true,
              abortOnDecline: true,
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              payCost: false,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });

  it("records the exact catalog and both zero-cost level-2 evolution routes", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["System"],
      types: ["Wallpaper"],
      linkDp: 2000,
    });
    for (const baseCard of ["BT2-005", "EX10-001"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: CARD_ID, as: "kabe" }] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("kabe").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
  });

  it("links only to Appmon for exactly 1 and contributes +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [{ card: CARD_ID, as: "kabe" }],
      },
    });
    s.state.memory = 1;
    await s.ready();
    const baseDp = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("kabe").instanceId,
        targetPermanentId: s.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("kabe").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(baseDp + 2000);
  });

  it("Security battles first, then plays Kabemon without paying the cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [CARD_ID] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("Q5076 may trash itself to De-Digivolve exactly 1 opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "kabe" }] }] },
        1: { battleArea: [{ card: "BT10-081", as: "target", under: [{ card: "BT10-074", as: "source" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("kabe").instanceId);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("source").instanceId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT10-081");
  });

  it("Q5077 may trash another same-host link, while refusal preserves both stacks", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              linked: [
                { card: CARD_ID, as: "kabe" },
                { card: "BT26-010", as: "other" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT10-081", as: "target", under: [{ card: "BT10-074", as: "source" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("other").instanceId);
    advance(accepted.engine).ledgers.continuous.addLinkMaxGrant(
      accepted.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    await accepted.ready();
    await advance(accepted.engine).fire(EffectTiming.OnUseAttack, accepted.perm("host"));
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("kabe").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("other").instanceId,
    );
    expect(accepted.perm("target").topCard.instanceId).toBe(accepted.inst("source").instanceId);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "kabe" }] }] },
        1: { battleArea: [{ card: "BT10-081", as: "target", under: [{ card: "BT10-074", as: "source" }] }] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnUseAttack, declined.perm("host"));
    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.perm("target").topCard.cardId).toBe("BT10-081");
  });
});
