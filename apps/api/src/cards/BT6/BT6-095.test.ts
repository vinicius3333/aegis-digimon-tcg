import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-095.js";

describe("BT6-095 Happy Bullet Showering", () => {
  it("can be used off-color with a Three Musketeers Digimon and no waiver prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-112"],
          hand: [{ card: "BT6-095", as: "option" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT6-095"));

    expect(s.state.memory).toBe(0);
  });

  it("deletes all opposing Digimon with the lowest DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-007"], hand: [{ card: "BT6-095", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT6-032", as: "low" },
            { card: "BT6-033", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length < 2);

    expect(s.state.players[1]!.battleArea.length).toBeLessThan(2);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-095", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT6-095 Happy Bullet Showering — KB Q&A rulings", () => {
  it("can be used with no red Digimon or Tamer when a [Three Musketeers] Digimon is in play (Q1481)", async () => {
    const withoutMusketeer = setupEngine({
      0: { battleArea: ["BT12-079"], hand: [{ card: "BT6-095", as: "option" }] },
    });
    withoutMusketeer.state.memory = 7;
    await withoutMusketeer.ready();

    expect(
      withoutMusketeer.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withoutMusketeer.inst("option").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(withoutMusketeer.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT6-095");

    const withMusketeer = setupEngine({ 0: { battleArea: ["BT6-112"], hand: [{ card: "BT6-095", as: "option" }] } });
    withMusketeer.state.memory = 7;
    await withMusketeer.ready();

    expect(
      withMusketeer.engine.applyIntent(0, { type: "playCard", instanceId: withMusketeer.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => withMusketeer.state.players[0]!.trash.some((card) => card.cardId === "BT6-095"));

    expect(withMusketeer.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT6-095");
    expect(withMusketeer.state.memory).toBe(0);
  });

  it("deletes every opposing Digimon tied for the lowest DP and spares higher DP ones (Q1482)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-007"], hand: [{ card: "BT6-095", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-064", as: "tiedFirst" },
            { card: "BT1-064", as: "tiedSecond" },
            { card: "BT1-065", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const tiedIds = [s.perm("tiedFirst").permanentId, s.perm("tiedSecond").permanentId];
    const higherId = s.perm("higher").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT6-095"));

    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(remaining).toEqual([higherId]);
    expect(remaining).not.toContain(tiedIds[0]);
    expect(remaining).not.toContain(tiedIds[1]);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-064")).toHaveLength(2);
  });
});
