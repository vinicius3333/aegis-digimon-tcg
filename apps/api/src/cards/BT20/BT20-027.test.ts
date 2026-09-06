import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT20-027.js";
import "./index.js";

describe("BT20-027 Slayerdramon", () => {
  it("registers the compiled card and preserves piercing", () => {
    expect(getEffectModule("BT20-027")).toBeDefined();
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Piercing" }] });
  });

  it("trashes three cards from an opposing stack and deletes a stackless Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "TrashDigivolution",
            amount: 3,
            target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          },
          { kind: "Delete", target: { filter: { controller: "opponent", digivolutionCards: "none" } } },
        ],
      });
    }
  });

  it("unsuspends an own Dracomon/Examon-text Digimon after the opponent loses security", () => {
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
  });

  it("installs inherited leave prevention paid by suspending this Digimon", () => {
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          affectsAll: true,
          leaveCause: "otherThanBattle",
          cost: { kind: "suspend", target: { isSelf: true } },
        },
      ],
    });
  });

  it("trashes three sources, then deletes the now-stackless opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "slayerdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-017", as: "stacked", under: ["BT20-014", "BT20-013", "BT20-008"] },
            { card: "BT20-017", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("stacked").permanentId);
    const stackedId = s.perm("stacked").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("slayerdramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === stackedId));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-014", "BT20-013", "BT20-008", "BT20-017"]),
    );
    expect(s.perm("untouched")).toBeDefined();
    expect(observe(s.engine).hasPierce(s.perm("slayerdramon"))).toBe(true);
  });

  it("unsuspends only a Dracomon/Examon-text ally after opponent security removal, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-027", as: "slayerdramon" },
            { card: "BT20-023", suspended: true, as: "textMatch" },
            { card: "BT20-010", suspended: true, as: "nonMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("textMatch").permanentId);
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => !s.perm("textMatch").isSuspended);
    expect(s.perm("nonMatch").isSuspended).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("textMatch").permanentId]);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("textMatch").isSuspended).toBe(true);
  });

  it("inherits batch leave prevention for every matching Digimon by suspending the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-028", as: "host", under: ["BT20-027"] },
            { card: "BT20-023", as: "firstMatch" },
            { card: "BT20-040", as: "secondMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ids = [s.perm("firstMatch").permanentId, s.perm("secondMatch").permanentId];
    expect(await advance(s.engine).verb.deletePermanent(ids, "byEffect")).toBe(0);
    expect(s.perm("firstMatch")).toBeDefined();
    expect(s.perm("secondMatch")).toBeDefined();
    expect(s.perm("host").isSuspended).toBe(true);
  });
  it("publicly evolves from Wingdramon and resolves the printed stack trash/delete sequence", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-025", as: "wingdramon" }], hand: [{ card: "BT20-027", as: "slayerdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-017", as: "stacked", under: ["BT20-014", "BT20-013", "BT20-008"] },
            { card: "BT20-017", as: "untouched", under: ["BT20-008"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wingdramon").permanentId,
        instanceId: s.inst("slayerdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("wingdramon").topCard.cardId === "BT20-027" &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.filter((card) => ["BT20-014", "BT20-013", "BT20-008"].includes(card.cardId))
          .length === 3,
    );
    expect(s.perm("wingdramon").stack.map((card) => card.cardId)).toContain("BT20-025");
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT20-017" && permanent.stack.length === 0,
      ),
    ).toBe(false);
    expect(s.perm("untouched").stack.map((card) => card.cardId)).toEqual(["BT20-008"]);
  });

  it("allows inherited leave prevention to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-028", as: "host", under: ["BT20-027"] },
            { card: "BT20-023", as: "match" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("match").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-023")).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
