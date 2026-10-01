import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT5/BT5-087.js";
import "./ST13-01.js";
import "./ST13-16.js";

const MILLED = ["BT1-009", "BT1-010", "BT1-011"];

describe("ST13-01 Sakuttomon", () => {
  it("gains 1 memory when an effect plays another Legend-Arms Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-12", under: ["ST13-01"] }],
          hand: [{ card: "ST13-16", as: "option" }, "ST13-04"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 1 && s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-04"),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-04")).toBe(true);
  });

  it("does not gain memory when a Legend-Arms Digimon is played normally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-12", under: ["ST13-01"] }],
          hand: [{ card: "ST13-04", as: "legend-arm" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("legend-arm").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST13-04"));

    expect(s.state.memory).toBe(3);
  });
});

describe("ST13-01 Sakuttomon — KB Q&A rulings", () => {
  it("gains only 1 memory when one effect plays 2 Legend-Arms Digimon at the same time (Q764)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-087", as: "zwart", under: ["ST13-01"] }],
          deck: MILLED,
          trash: [
            { card: "BT3-064", as: "tiaLudomon" },
            { card: "BT3-069", as: "raijiLudomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("zwart"));
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await drainMicrotasks();

    const played = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    expect(played).toContain(s.inst("tiaLudomon").instanceId);
    expect(played).toContain(s.inst("raijiLudomon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory from each of 2 Sakuttomon sources when 1 Legend-Arms Digimon is played by an effect (Q765)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-087", as: "zwart", under: ["ST13-01"] },
            { card: "ST13-12", as: "knightmon", under: ["ST13-01"] },
          ],
          deck: MILLED,
          trash: [{ card: "BT3-064", as: "tiaLudomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("zwart"));
    await settle(() => s.state.players[0]!.battleArea.length === 3 && s.state.memory === 2);

    expect(s.perm("tiaLudomon").topCard.cardId).toBe("BT3-064");
    expect(s.state.memory).toBe(2);
  });
});
