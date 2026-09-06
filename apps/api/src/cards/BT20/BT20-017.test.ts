import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-017.js";
import "./index.js";

describe("BT20-017 Jesmon", () => {
  it("encodes the complete token and keeps the attack inside the played-Digimon watcher", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayToken",
            tokens: [
              {
                name: "Atho, René & Por",
                keywords: [
                  { keyword: "Reboot" },
                  { keyword: "Blocker" },
                  { keyword: "Decoy", colors: ["Red", "Black"] },
                ],
              },
            ],
            count: 1,
            payCost: false,
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } },
                count: 1,
              },
            },
            { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, optional: true },
          ],
        },
      ],
    });
  });

  it("optionally plays the 6000-DP white token with all three printed keywords", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT20-017", as: "jesmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jesmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "TOKEN-AthoRenePor-Token"),
    );

    const token = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "TOKEN-AthoRenePor-Token")!;
    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Decoy")).toBe(true);
  });

  it("can refuse the optional token on public play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT20-017", as: "jesmon" }] } }, { autoDeclineOptional: true });
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jesmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-017"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("reaches Jesmon from a legal SaviorHuckmon stack through public evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-014", as: "base" }], hand: [{ card: "BT20-017", as: "jesmon" }] },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 8000, as: "boundary" },
            { card: "BT20-014", dp: 8001, as: "high" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-017");
    expect(s.perm("base").topCard.cardId).toBe("BT20-017");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-014"]);
  });

  it("once per turn deletes an 8000-DP target after another Digimon is played, then may decline the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-017", as: "jesmon" }],
          hand: [
            { card: "BT20-010", as: "firstPlay" },
            { card: "BT20-010", as: "secondPlay" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 8000, as: "boundary" },
            { card: "BT20-014", dp: 7000, as: "secondEligible" },
            { card: "BT20-017", dp: 9000, as: "tooLarge" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.perm("tooLarge")).toBeDefined();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 50);
    expect(s.perm("secondEligible")).toBeDefined();
  });
});
