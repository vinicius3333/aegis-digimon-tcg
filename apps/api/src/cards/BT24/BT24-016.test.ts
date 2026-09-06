import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-016.js";
import "../index.js";

describe("BT24-016 Lamiamon", () => {
  it("uses the Dimetromon placement cost to digivolve an Elizamon host", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main")?.actions?.[0] as any;
    expect(main).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
    });
    expect(main.cost).toMatchObject({ kind: "place", bindHostAs: "bt24_016_elizamon", position: "bottom" });
    expect(main.cost.target.filter.nameOrTrait).toEqual([{ tokens: ["Dimetromon"], match: "name" }]);
    expect(main.target.fromSelectionRef).toBe("bt24_016_elizamon");
  });

  it("shares the once-per-turn opponent security manipulation", () => {
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving") as any;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking") as any;
    expect(digivolving.sharedUseKey).toBe(attacking.sharedUseKey);
    expect(digivolving.frequency).toBe("OncePerTurn");
    expect(digivolving.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "addBottom", controller: "opponent", source: "hand" },
      { kind: "SecurityManipulation", op: "trashTop", controller: "opponent" },
    ]);
  });

  it("scopes its inherited play trigger to the opponent security stack", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
    });
  });

  it("places Dimetromon under Elizamon and digivolves for cost 2 after Elizamon's reduction (Q5586)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-016", as: "lamiamon" }],
          trash: [{ card: "BT24-012", as: "dimetromon" }],
          battleArea: [
            { card: "BT23-005", as: "elizamon" },
            { card: "BT24-082", as: "owen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("lamiamon"));
    await settle(() => s.perm("elizamon").topCard.instanceId === s.inst("lamiamon").instanceId);

    expect(s.perm("elizamon").stack.map((card) => card.instanceId)).toContain(s.inst("dimetromon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("cannot use the hand evolution without Owen Dreadnought", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-016", as: "lamiamon" }],
          trash: [{ card: "BT24-012", as: "dimetromon" }],
          battleArea: [{ card: "BT23-005", as: "elizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("lamiamon"));

    expect(s.perm("elizamon").topCard.cardId).toBe("BT23-005");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("dimetromon").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("places an opponent hand card as bottom security, then trashes their top security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-016", as: "lamiamon" }] },
        1: {
          hand: [{ card: "BT4-022", as: "placed" }],
          security: [{ card: "BT4-022", as: "trashed" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lamiamon"));

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("placed").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashed").instanceId);
  });

  it("lets the opponent choose which of their hand cards becomes their bottom security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-016", as: "lamiamon" }] },
      1: {
        hand: [
          { card: "BT4-022", as: "kept" },
          { card: "BT4-022", as: "placed" },
        ],
        security: [{ card: "BT4-022", as: "trashed" }],
      },
    });
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("lamiamon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("placed").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("placed").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashed").instanceId]);
    // The count ends where it began, so the seat on the add is all a client has to narrate it.
    expect(s.events).toContainEqual({
      kind: "cardsMoved",
      instanceIds: [s.inst("placed").instanceId],
      from: "various",
      to: "security",
      seat: 1,
    });
  });

  it("shares one security-manipulation use between digivolving and attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-016", as: "lamiamon" }] },
        1: {
          hand: [
            { card: "BT4-022", as: "first" },
            { card: "BT4-022", as: "second" },
          ],
          security: ["BT4-022", "BT4-022"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lamiamon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("lamiamon"));

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("plays one 5000-DP Reptile from hand when opposing security is removed, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-016"] }],
          hand: [
            { card: "BT24-012", as: "eligible" },
            { card: "BT24-016", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-012"));
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("eligible").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooLarge").instanceId);
  });
});
