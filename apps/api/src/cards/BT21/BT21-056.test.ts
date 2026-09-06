import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-056.js";
import "../index.js";

describe("BT21-056 Vemmon", () => {
  it("preserves full coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("trashes a Vemmon-text card to return a non-Digi-Egg Vemmon-text card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0] as { target?: unknown; cost?: unknown } | undefined;

    expect(action).toMatchObject({ optional: true, abortOnDecline: true });
    expect(action?.target).toEqual({
      filter: {
        controller: "mine",
        kind: ["Digimon", "Option", "Tamer"],
        zone: "trash",
        nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }],
      },
      count: 1,
    });
    expect(action?.cost).toEqual({
      kind: "trash",
      target: {
        filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] },
        count: 1,
      },
      raw: "By trashing 1 card with [Vemmon] in its text from your hand",
    });
  });

  it("restricts inherited cost reduction to this Digimon and Vemmon-text Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { isSelfRef: true },
      into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });

  it("pays with a Vemmon-text hand card and returns a non-Digi-Egg Vemmon-text card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-056", as: "played" },
            { card: "BT11-061", as: "cost" },
          ],
          trash: [
            { card: "BT21-058", as: "returned" },
            { card: "BT21-006", as: "egg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.inst("returned").instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returned").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("egg").instanceId)).toBe(true);
  });

  it("offers the effect with an empty trash because the trashed cost card becomes the target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-056", as: "played" },
            { card: "BT11-061", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("declining the recovery leaves the hand cost and trash target in place", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-056", as: "vemmon" }],
          hand: [{ card: "BT11-061", as: "cost" }],
          trash: [{ card: "BT21-058", as: "target" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("vemmon"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("reduces only the first Vemmon-text evolution each turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-058", as: "host", under: [{ card: "BT21-056", as: "source" }] }],
        hand: [
          { card: "BT21-060", as: "destromon" },
          { card: "BT21-062", as: "galacticmon" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("destromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("destromon").instanceId);
    expect(s.state.memory).toBe(8);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("galacticmon").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("carries the inherited reduction through a legal public egg-to-Vemmon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-006", as: "egg" }],
          hand: [
            { card: "BT21-056", as: "vemmon" },
            { card: "BT21-058", as: "snatchmon" },
            { card: "BT21-060", as: "destromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("vemmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-056");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-058");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("destromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-060");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT21-006", "BT21-056", "BT21-058"]);
    expect(s.perm("egg").stack.filter((card) => card.cardId === "BT21-056")).toHaveLength(1);
    expect(s.perm("egg").stack.some((card) => card.cardId === "BT21-058")).toBe(true);
    expect(s.state.memory).toBe(5);
  });
});
