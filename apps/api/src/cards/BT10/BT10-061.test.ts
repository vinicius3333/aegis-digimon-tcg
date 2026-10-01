import { describe, expect, it } from "vitest";
import { effectiveExactNames, getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-061.js";
import "./BT10-066.js";

describe("BT10-061 SkullKnightmon: Mighty Axe Mode", () => {
  it("matches its catalog, two-material DigiXros, reveal, delete, and Rule IR", () => {
    const d = getCardDefinition("BT10-061")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Black"], 4, 4, 5000]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 3, memoryCost: 3 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Champion"], ["Virus"], ["Enhancement", "Twilight"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }], count: 1 },
    ]);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual(["OnPlay", "Rule"]);
  });

  it("adds an eligible card and trashes the rest of the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-061", as: "source" }],
          deck: [{ card: "BT10-092", as: "nene" }, "BT10-062", "BT10-064"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.trash.length === 2);
    expect(player.trash).toHaveLength(2);
  });

  it("still deletes after a two-card DigiXros when the reveal has no eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-061", as: "source" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
          deck: ["BT10-062", "BT10-064", "BT10-065"],
        },
        1: { battleArea: [{ card: "BT7-058", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("skullKnightmon").instanceId, s.inst("deadlyAxemon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 3 &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("does not delete after DigiXrosing with only one material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-061", as: "source" },
            { card: "BT7-058", as: "material" },
          ],
          deck: ["BT10-062", "BT10-064", "BT10-065"],
        },
        1: { battleArea: [{ card: "BT7-058", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 3);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });

  it("is treated as DeadlyAxemon in hand for DarkKnightmon's DigiXros rule", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT10-061", as: "mightyAxeMode" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const darkKnightmonId = s.inst("darkKnightmon").instanceId;
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: darkKnightmonId,
        digiXros: {
          materialInstanceIds: [s.inst("skullKnightmon").instanceId, s.inst("mightyAxeMode").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        ({ topCard, stack }) => topCard.instanceId === darkKnightmonId && stack.length === 2,
      ),
    );

    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("fills DarkKnightmon's SkullKnightmon slot from hand but never both slots at once", () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT10-061", as: "mightyAxeMode" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    const play = (materials: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnightmon").instanceId,
        digiXros: { materialInstanceIds: materials.map((alias) => s.inst(alias).instanceId) },
      });

    expect(play(["mightyAxeMode", "skullKnightmon", "deadlyAxemon"])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(play(["mightyAxeMode", "deadlyAxemon"])).toEqual({ ok: true });
  });
});

describe("BT10-061 SkullKnightmon: Mighty Axe Mode — KB Q&A rulings", () => {
  async function playWithUnhelpfulReveal(materialCards: string[]) {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-061", as: "source" },
            ...materialCards.map((card, index) => ({ card, as: `material${index}` })),
          ],
          deck: ["BT10-062", "BT10-064", "BT10-065"],
        },
        1: { battleArea: [{ card: "BT7-058", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        ...(materialCards.length > 0
          ? {
              digiXros: {
                materialInstanceIds: materialCards.map((_, index) => s.inst(`material${index}`).instanceId),
              },
            }
          : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 3);
    await settle();
    return s;
  }

  it("still deletes after a two-card DigiXros even when the reveal adds nothing to hand (Q1987)", async () => {
    const digiXrosed = await playWithUnhelpfulReveal(["BT7-058", "BT7-059"]);
    expect(digiXrosed.state.players[0]!.hand).toHaveLength(0);
    expect(digiXrosed.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual([
      "BT10-062",
      "BT10-064",
      "BT10-065",
    ]);
    expect(digiXrosed.state.players[1]!.battleArea).toHaveLength(0);
    expect(digiXrosed.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT7-058"]);

    const plainPlay = await playWithUnhelpfulReveal([]);
    expect(plainPlay.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("is always also named [SkullKnightmon] and [DeadlyAxemon], even among digivolution cards (Q1988)", async () => {
    expect(effectiveExactNames(getCardDefinition("BT10-061")!)).toEqual(
      expect.arrayContaining(["SkullKnightmon: Mighty Axe Mode", "SkullKnightmon", "DeadlyAxemon"]),
    );

    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-066",
              as: "darkKnightmon",
              under: [
                { card: "BT10-061", as: "mightyAxeMode" },
                { card: "BT10-062", as: "golemon" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const mightyAxeModeId = s.inst("mightyAxeMode").instanceId;
    preferred.push(s.inst("golemon").instanceId);
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("darkKnightmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === mightyAxeModeId));
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("golemon").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([mightyAxeModeId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT10-066");
  });
});
