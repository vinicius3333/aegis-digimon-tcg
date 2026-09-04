import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX5-062.js";

// EX5-062 (Anubismon): when an effect plays one of your Digimon, delete one opposing level-5-or-
// lower Digimon; if no deletion occurs, draw one card. The watcher also observes plays made by
// this card's own effect.

const ANUBIS = "EX5-062";
const PURPLE_PLAY = "BT10-073"; // ChuuChuumon, purple Lv.3 — the Digimon played by effect from trash
const OPP_LV5 = "BT1-058"; // Chirinmon, Lv.5 — a legal delete target
const OPP_LV6 = "BT2-018"; // Volcanicdramon, Lv.6 — NOT a legal target (level filter)

describe("EX5-062 deletes a Lv.5- opp Digimon when an effect plays your Digimon", () => {
  it("tracks all cards trashed before paying the reduced trash play cost", async () => {
    const whenDigivolving = compiled.effects?.find((effect) => effect.trigger === "WhenDigivolving");
    const trash = whenDigivolving?.actions.find((action) => action.kind === "Trash");
    const play = whenDigivolving?.actions.find((action) => action.kind === "PlayWithoutCost");
    expect(trash).toMatchObject({ kind: "Trash", trackCount: "anubismonTrashed" });
    expect(play).toMatchObject({ kind: "PlayWithoutCost", reduceCostBy: 3, payCost: true });
    expect(play?.kind === "PlayWithoutCost" ? play.reduceCostByScaling : undefined).toEqual({
      per: 1,
      unit: "namedCount",
      countSource: "anubismonTrashed",
    });
    expect(
      compiled.effects
        ?.filter((effect) => effect.trigger === "Main" || effect.trigger === "WhenDigivolving")
        .map((effect) => effect.sharedUseKey),
    ).toEqual(["ir-shared-0", "ir-shared-0"]);

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-060", as: "base" }],
          hand: [
            { card: ANUBIS, as: "evolving" },
            { card: "BT1-009", as: "discard1" },
            { card: "BT1-010", as: "discard2" },
            { card: "BT1-011", as: "discard3" },
          ],
          trash: [{ card: "BT10-080", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-080"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-080")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010", "BT1-011"].includes(card.cardId)),
    ).toHaveLength(3);
  });

  it("activates the Main effect publicly and pays the remaining reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ANUBIS, as: "anubis" }],
          hand: ["BT1-009", "BT1-010", "BT1-011"],
          trash: [{ card: "BT10-080", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const effect = observe(s.engine)
      .activatableEffects(s.perm("anubis"))
      .find((entry) => /trash/i.test(entry.description ?? ""));
    if (effect?.instanceId === undefined) throw new Error("EX5-062 Main trash effect is unavailable");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effect.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-080"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-080")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).activatableEffects(s.perm("anubis"))).toHaveLength(0);
  });

  it("an effect-play triggers the watcher and deletes the opponent's Lv.5 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: ANUBIS, dp: 5000 }], trash: [{ card: PURPLE_PLAY, as: "toPlay" }] },
        1: { battleArea: [{ card: OPP_LV5, dp: 5000, as: "oppLv5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const oppLv5Id = s.perm("oppLv5").permanentId;

    await advance(s.engine).verb.playInstances([s.inst("toPlay").instanceId]);
    await settle(() => !p1.battleArea.some((p) => p.permanentId === oppLv5Id));

    // The purple Digimon was played by effect...
    expect(p0.battleArea.some((p) => p.topCard?.cardId === PURPLE_PLAY)).toBe(true);
    // ...and EX5-062 deleted the opponent's Lv.5 Digimon.
    expect(p1.battleArea.some((p) => p.permanentId === oppLv5Id)).toBe(false);
  });

  it("with only a Lv.6 opp Digimon, nothing is deleted (level filter) — draws instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ANUBIS, dp: 5000 }],
          trash: [{ card: PURPLE_PLAY, as: "toPlay" }],
          deck: Array.from({ length: 10 }, () => OPP_LV6),
        },
        1: { battleArea: [{ card: OPP_LV6, dp: 5000, as: "oppLv6" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const oppLv6Id = s.perm("oppLv6").permanentId;
    const deckBefore = p0.deck.length;

    await advance(s.engine).verb.playInstances([s.inst("toPlay").instanceId]);
    await settle(() => p0.deck.length < deckBefore);

    // The Lv.6 Digimon is NOT a legal target (level 5 filter) → it survives, and EX5-062 draws 1.
    expect(p1.battleArea.some((p) => p.permanentId === oppLv6Id)).toBe(true);
    expect(deckBefore - p0.deck.length).toBeGreaterThanOrEqual(1);
  });

  it("does not trigger from a manual play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: ANUBIS, dp: 5000 }], hand: [{ card: PURPLE_PLAY, as: "manual" }] },
        1: { battleArea: [{ card: OPP_LV5, dp: 5000, as: "oppLv5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const oppLv5Id = s.perm("oppLv5").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === oppLv5Id)).toBe(true);
  });

  it("shares one once-per-turn use between Main and When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ANUBIS, as: "anubis" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          trash: [
            { card: PURPLE_PLAY, as: "first" },
            { card: PURPLE_PLAY, as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const main = observe(s.engine)
      .activatableEffects(s.perm("anubis"))
      .find((entry) => /trash/i.test(entry.description ?? ""));
    if (main?.instanceId === undefined) throw new Error("EX5-062 Main trash effect is unavailable");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: main.instanceId,
        effectKey: main.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("first").instanceId),
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("anubis"));

    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === PURPLE_PLAY)).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
  });
});
