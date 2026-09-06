import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-084.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT21-084 Haru Shinkai", () => {
  it("sets memory at the start of turn, draws on linking, and fuses from hand", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "SetMemory",
            value: 3,
            condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
          }),
        ],
      }),
    );
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    const linkedActions = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions;
    expect(linkedActions?.[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "suspend" } });
    expect(linkedActions?.[1]).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
    expect(yourTurn?.actions).toHaveLength(1);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("app fuses only from the linked-trigger window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon", linked: [{ card: "BT21-070", as: "gossipmon" }] },
          ],
          hand: ["BT21-073"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("sociamon").permanentId,
    });

    expect(s.perm("sociamon").topCard?.cardId).toBe("BT21-073");
    expect(s.perm("sociamon").stack.some((card) => card.cardId === "BT21-043")).toBe(false);
  });

  it.each([
    [2, 3],
    [3, 3],
    [4, 4],
  ])("sets memory from %i to %i at start of turn", async (before, after) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-084", as: "haru" }] } });
    await s.ready();
    s.state.memory = before;

    await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("haru"));
    expect(s.state.memory).toBe(after);
  });

  it("public linking suspends Haru, draws, and app fuses the linked Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon" },
          ],
          hand: [
            { card: "BT21-070", as: "gossipmon" },
            { card: "BT21-073", as: "charismon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("sociamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sociamon").topCard.instanceId === s.inst("charismon").instanceId);

    expect(s.perm("haru").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("declining the watcher leaves Haru unsuspended and does not draw or fuse", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon" },
          ],
          hand: [
            { card: "BT21-073", as: "charismon" },
            { card: "BT21-070", as: "gossipmon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("sociamon").permanentId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("sociamon").linked.some((card) => card.instanceId === s.inst("gossipmon").instanceId));
    expect(s.perm("sociamon").linked).toHaveLength(1);
    expect(s.perm("haru").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("sociamon").topCard.cardId).toBe("BT21-043");
  });

  it("does not trigger for an opponent's linked Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-084", as: "haru" }], deck: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT21-043", as: "opponent" }],
          hand: [{ card: "BT21-070", as: "link" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("opponent").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").linked.length === 1);
    expect(s.perm("haru").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-084", as: "haru" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("haru"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});
