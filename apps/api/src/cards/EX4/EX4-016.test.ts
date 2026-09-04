import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-016.js";
import "../index.js";

describe("EX4-016 Greymon", () => {
  it("reveals three and adds Kiriha plus a blue or black card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Kiriha Aonuma"] }] } },
        { count: 1, to: "hand", filter: { colors: ["Blue", "Black"], hasDigiXrosRequirements: true } },
      ],
      rest: "trash",
    });
  });
  it("has Save and inherited attack draw", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toMatchObject([
      { keyword: "Save" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1 }],
    });
  });

  it("adds Kiriha and a blue DigiXros card from the top three and trashes the rest", async () => {
    const s = setupEngine(
      { 0: { deck: ["BT10-088", "BT10-024", "BT1-010"], battleArea: [{ card: "EX4-016", as: "greymon" }] } },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-024")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("does not select a blue card without DigiXros requirements", async () => {
    const s = setupEngine(
      { 0: { deck: ["BT10-088", "BT10-024", "BT10-019"], battleArea: [{ card: "EX4-016", as: "greymon" }] } },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT10-088", "BT10-024"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-019")).toBe(true);
  });

  it("adds the available Kiriha even when no qualifying DigiXros card is revealed", async () => {
    const s = setupEngine(
      { 0: { deck: ["BT10-088", "BT1-010", "BT1-011"], battleArea: [{ card: "EX4-016", as: "greymon" }] } },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT10-088"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011"]),
    );
  });

  it("draws from the inherited effect when the host attacks", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-016"] }],
      },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("may Save itself under a Tamer after deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-016", as: "greymon" },
            { card: "BT10-088", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const savedInstanceId = s.perm("greymon").topCard!.instanceId;
    preferred.push(s.perm("tamer").permanentId);

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === savedInstanceId));

    expect(s.perm("tamer").stack.some((card) => card.instanceId === savedInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === savedInstanceId)).toBe(false);
  });

  it("leaves itself in the trash when Save is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-016", as: "greymon" },
            { card: "BT10-088", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const savedInstanceId = s.perm("greymon").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === savedInstanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === savedInstanceId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === savedInstanceId)).toBe(false);
  });
});
