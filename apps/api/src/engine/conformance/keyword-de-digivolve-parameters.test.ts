import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/BT19/BT19-026.js";
import "../../cards/BT19/BT19-063.js";
import "../../cards/P/P-240.js";

const fingerprint = "7a6651cefa85e454cb7e4e43b0fe25217d28676ed7ef13c1dca57b1c8c4365bd";

describe("§16-12 De-Digivolve parameters", () => {
  beforeEach(() =>
    cite(
      "comprehensive-0230",
      "§16-12 De-Digivolve declares 1 through N, trashes from the top, and cannot trash level 3 or lower",
      fingerprint,
    ),
  );

  it("publicly plays BT19-063 and trashes exactly one top source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-014", as: "ally" }], hand: [{ card: "BT19-063", as: "dark" }] },
        1: { battleArea: [{ card: "BT1-014", as: "victim", under: [{ card: "BT1-009", as: "source" }] }] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const hostId = s.perm("victim").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dark").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === hostId));
    expect(s.perm("victim").topCard!.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(hostId);
  });

  it("publicly plays BT19-026 and trashes exactly two top sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "ally" }], hand: [{ card: "BT19-026", as: "zeig" }] },
        1: {
          battleArea: [
            {
              card: "BT1-014",
              as: "victim",
              under: [
                { card: "BT1-009", as: "bottom" },
                { card: "BT1-013", as: "two" },
                { card: "BT1-014", as: "one" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    const ids = [s.perm("victim").topCard!.instanceId, s.inst("one").instanceId];
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeig").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === ids[1]));
    expect(s.perm("victim").topCard!.cardId).toBe("BT1-013");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(ids));
  });

  it("does not trash a level 3-only stack or an empty stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-014", as: "ally" }], hand: [{ card: "BT19-063", as: "dark" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-014", as: "empty" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dark").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("victim").topCard!.cardId).toBe("BT1-009");
    expect(s.perm("empty").topCard!.cardId).toBe("BT1-014");
  });

  it("publicly plays P-240 and trashes three top cards without removing the level 3 card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-014", as: "ally" }], hand: [{ card: "P-240", as: "arcturus" }] },
        1: {
          battleArea: [
            {
              card: "BT1-080",
              as: "victim",
              under: [
                { card: "BT1-009", as: "level3" },
                { card: "BT1-070", as: "middle" },
                { card: "BT1-020", as: "topSource" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    const ids = [s.perm("victim").topCard!.instanceId, s.inst("middle").instanceId, s.inst("topSource").instanceId];
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arcturus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("topSource").instanceId));
    expect(s.perm("victim").topCard!.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(ids));
  });

  it("uses the public number choice to declare one of a printed De-Digivolve 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "ally" }], hand: [{ card: "BT19-026", as: "zeig" }] },
        1: {
          battleArea: [
            {
              card: "BT1-014",
              as: "victim",
              under: [
                { card: "BT1-009", as: "bottom" },
                { card: "BT1-013", as: "source" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 12;
    const hostId = s.perm("victim").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeig").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === hostId));
    expect(s.perm("victim").topCard!.cardId).toBe("BT1-013");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([hostId]);
  });
});
