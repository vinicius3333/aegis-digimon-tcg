import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-024.js";

describe("EX6-024 Sagomon", () => {
  it("shares DigiXros Security Attack reduction and suspends an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      { kind: "Restrict", restriction: "suspend", condition: { kind: "digiXrosCount", minimum: 1 } },
    ]);
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("inherits Security Attack -1 and returns a yellow source from its own stack on leave", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "digivolutionCards", colors: ["Yellow"], hostFilter: { isSelfRef: true } } },
        },
      ],
    });
  });
  it("publicly applies Security Attack -1 to an opposing Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-024", as: "sago" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sago"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sago"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });
  it("publicly restricts an opposing Digimon from suspending on DigiXros", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-024", as: "sago" },
            { card: "EX6-025", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("sago").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-024"));
    const opponent = s.perm("opponent");
    expect(observe(s.engine).isRestricted(opponent, "suspend")).toBe(true);
  });

  it("does not restrict an opposing Digimon without DigiXros", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-024", as: "sago" }] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sago"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });

  it("publicly restricts an opposing Tamer from suspending on DigiXros", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-024", as: "sago" },
            { card: "EX6-025", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "EX6-074", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("sago").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("sago").instanceId),
    );
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "suspend")).toBe(true);
  });

  it("publicly grants Security Attack -1 to your other Digimon when selected", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-024", as: "sago" },
            { card: "BT1-009", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("ally").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sago"));
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(-1);
  });

  it("shares one optional use between the On Play and When Attacking windows", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-024", as: "sago" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("ally").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sago"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sago").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(-1);
  });

  it("expires the DigiXros suspend restriction after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-024", as: "sago" },
            { card: "EX6-025", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("sago").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-024"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    await s.engine.runOneTurn();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });

  it("publicly returns its yellow evolution card when leaving play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-024", as: "sago", under: ["EX6-019"] }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("sago").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sago").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("publicly returns its source after a real DigiXros host leaves play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-024", as: "sago" },
            { card: "EX6-025", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("sago").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("sago").instanceId),
    );
    await advance(s.engine).verb.deletePermanent([s.state.players[0]!.battleArea[0]!.permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});
