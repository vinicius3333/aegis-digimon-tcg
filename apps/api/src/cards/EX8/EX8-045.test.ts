import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-045.js";

describe("EX8-045", () => {
  it("suspends an opposing Digimon or Tamer and returns an opposing suspended Tamer to the bottom of the deck when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1 } },
      { kind: "Return", to: "deckBottom", target: { count: 1 } },
    ]));
  it("gains +1000 DP per your Digimon color and conditionally gains Piercing and Security Attack +1", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, scaling: { per: 1, unit: "colors" } });
    expect(actions[1]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
      while: { kind: "opponentHasNone" },
    });
    expect(actions[2]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
    });
  });
  it("applies the multicolor DP bonus and both conditional keywords on live state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-045", as: "callismon", under: ["EX8-032", "EX8-030"] },
          { card: "EX8-029", as: "unrelated" },
        ],
      },
      1: { battleArea: [{ card: "AD1-001", as: "target" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    await settle(() => observe(s.engine).hasPierce(s.perm("callismon")));

    expect(s.perm("callismon").currentDP).toBe(13000);
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(1);
  });
  it("loses both conditional keywords when an opposing Digimon reaches the source DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-045", as: "callismon", under: ["EX8-032", "EX8-033"] }] },
      1: { battleArea: [{ card: "AD1-001", as: "target", dp: 14000 }] },
    });
    await s.ready();
    await settle(() => !observe(s.engine).hasPierce(s.perm("callismon")));

    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(0);
  });

  it("uses Security Attack +1 on a player attack while its conditional keywords are active", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-045", as: "callismon", under: ["EX8-032", "EX8-030"] }] },
      1: {
        battleArea: [{ card: "AD1-001", as: "target", dp: 5000, suspended: true }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("callismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1); // two checks from base +1 Security Attack.
  });

  it("suspends one opponent and may bottom-deck a different suspended Tamer", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-045", as: "callismon" }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "digimon" },
            { card: "BT1-087", as: "tamer", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("digimon").permanentId);
    const tamerId = s.inst("tamer").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("callismon"));
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(tamerId);
  });
});
