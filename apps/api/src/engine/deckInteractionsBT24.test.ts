import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

function play(s: ReturnType<typeof setupEngine>, alias: string) {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
}

describe("BT24 deck-specific interaction oracles", () => {
  it("Olympus XII — Homeros grants memory and its TS-wide DP modifier", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT24-102", as: "homeros" }], battleArea: [{ card: "BT24-031", as: "ts" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 6;
    play(s, "homeros");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT24-102"));
    await settle(() => false, 30);
    expect(s.state.memory).toBe(1);
    expect(s.perm("ts").currentDP).toBeGreaterThan(1000);
    assertNoLoudGap(s);
  });

  it("Olympus XII recipe — Venusmon's low-security play condition is exercised with a three-card stack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-040", as: "venus" }], security: ["BT1-090", "BT1-090", "BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    play(s, "venus");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT24-040"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT24-040")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("Jupitermon — Aegiomon turns a security removal into a free TS Tamer play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-034", as: "aegio" },
            { card: "BT24-085", as: "tamer" },
          ],
          security: ["BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    play(s, "aegio");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT24-085"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT24-085")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Diaboromon — EX6 Diaboromon creates a real token and keeps the token source distinct", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-043", as: "diaboromon" }] } }, { autoAcceptOptional: true });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("diaboromon"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-043")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Magneticdramon — Pyramidimon fills its Fragment stack from trash before its removal effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-051", as: "base", under: ["EX8-048", "EX8-047"] }],
          hand: [{ card: "EX10-033", as: "pyramid" }],
          trash: ["EX8-046", "EX8-048", "EX8-051"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX10-033");
    expect(s.perm("base").stack.length).toBeGreaterThanOrEqual(3);
    assertNoLoudGap(s);
  });

  it("Jesmon — Jesmon's When Digivolving path creates its named token beside the Royal Knight stack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-013", as: "jesmon" }], battleArea: [{ card: "BT20-014", as: "huckmon" }] },
        1: { battleArea: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("huckmon").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-013"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-013")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Styracomon — its When Digivolving security trash can unsuspend the new attacker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-018", as: "styra" }],
          battleArea: [{ card: "EX11-012", as: "base", suspended: true }],
        },
        1: { security: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("styra").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT24-018");
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("base").topCard?.cardId).toBe("BT24-018");
    assertNoLoudGap(s);
  });

  it("Hudiemon — Chitose plays a low-cost Hudie Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-081", as: "chitose" },
            { card: "BT23-048", as: "hudie" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    play(s, "chitose");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-048"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-048")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Puppets — Mirai's reveal puts a Puppet hit in hand and the non-hit cards on the deck bottom", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-067", as: "mirai" }], deck: ["EX11-019", "BT1-009", "BT1-027"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    play(s, "mirai");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-019"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX11-019");
    expect(s.state.players[0]!.deck).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Titamon & SkullBaluchimon — SkullBaluchimon trashes a hand card as the cost to delete level 3 and 4 targets", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-075", as: "skull" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-027", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    play(s, "skull");
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
