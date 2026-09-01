import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-097.js";

describe("BT13-097 Thomas H. Norstein", () => {
  it("sets memory to 3 at the start of turn when memory is 2 or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions?.[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", controller: "mine", value: 2, raw: "you have 2 or fewer memory" },
    });
  });

  it("draws for both players after a matching Digimon attacks, paying by suspending this Tamer", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as {
      sourceFilter?: unknown;
      actions?: unknown[];
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ match: "name", tokens: ["Gaomon", "GaoGamon"] }],
      },
    });
    expect(watcher.actions).toEqual([
      {
        kind: "Draw",
        controller: "mine",
        amount: 1,
        cost: {
          kind: "suspend",
          raw: "by suspending this Tamer",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
        // Paying the suspend cost is the controller's choice, and declining it must also
        // cancel the opponent's draw below.
        optional: true,
        abortOnDecline: true,
      },
      { kind: "Draw", controller: "opponent", amount: 1, condition: { kind: "ifThisEffectActed", raw: "you did" } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("sets memory to three at the start of turn when below the threshold", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-097", as: "thomas" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("thomas"));
    expect(s.state.memory).toBe(3);
  });

  it("suspends the Tamer and draws for both players when the cost is accepted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-097", as: "thomas" },
            { card: "BT13-021", as: "gaomon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const myHand = s.state.players[0]!.hand.length;
    const theirHand = s.state.players[1]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaomon").permanentId });
    await settle(() => s.perm("thomas").isSuspended);

    expect(s.perm("thomas").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(myHand + 1);
    expect(s.state.players[1]!.hand.length).toBe(theirHand + 1);
  });

  it("draws for both players from a real Gaomon attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-097", as: "thomas" },
            { card: "BT13-021", as: "gaomon" },
          ],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-002"], deck: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const myHand = s.state.players[0]!.hand.length;
    const theirHand = s.state.players[1]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gaomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("thomas").isSuspended);

    expect(s.state.players[0]!.hand.length).toBe(myHand + 1);
    expect(s.state.players[1]!.hand.length).toBe(theirHand + 1);
  });

  it("stays unsuspended and neither player draws when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-097", as: "thomas" },
            { card: "BT13-021", as: "gaomon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const myHand = s.state.players[0]!.hand.length;
    const theirHand = s.state.players[1]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaomon").permanentId });
    await settle(() => false, 60);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("thomas").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(myHand);
    expect(s.state.players[1]!.hand.length).toBe(theirHand);
  });
});
