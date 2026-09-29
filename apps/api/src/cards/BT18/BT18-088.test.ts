import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-088.js";
import "./BT18-018.js";
import "../BT1/BT1-060.js";
import "../BT17/BT17-011.js";
import "../BT17/BT17-012.js";
import "../BT17/BT17-017.js";
import "../BT17/BT17-022.js";
import "../BT17/BT17-023.js";
import "../BT17/BT17-028.js";
import "../EX6/EX6-012.js";

const INERT = "BT1-010";

interface SlideChain {
  attacker: string;
  slide: string;
  ancient: string;
}

type TurnDriver = (s: EngineSetup, stackId: string) => Promise<void>;

async function attackDuringMainPhase(s: EngineSetup, stackId: string) {
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: stackId, target: { kind: "player" } })).toEqual(
    { ok: true },
  );
  await advance(s.engine).finishAttack();
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
}

async function attackAtEndOfTurn(s: EngineSetup) {
  await advance(s.engine).runTurn(0);
}

async function slideIntoAncient(chain: SlideChain, driveTurn: TurnDriver) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: chain.attacker, as: "attacker", under: ["BT18-088"] }],
        hand: [
          { card: chain.slide, as: "slide" },
          { card: chain.ancient, as: "ancient" },
        ],
        deck: [INERT, INERT, INERT, INERT, INERT, INERT],
      },
      1: { security: [INERT, INERT, INERT], deck: [INERT, INERT, INERT] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds: preferred },
  );
  s.state.turnSeat = 0;
  s.state.memory = 5;
  await s.ready();
  const stackId = s.perm("attacker").permanentId;
  preferred.push(s.inst("slide").instanceId, s.inst("ancient").instanceId);

  await driveTurn(s, stackId);

  const digivolvedIntoAncient = s.events.some((event) => event.kind === "digivolved" && event.cardId === chain.ancient);
  const stack = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === stackId);
  return { digivolvedIntoAncient, top: stack?.topCard?.cardId };
}

describe("BT18-088 Takuya Kanbara & Koji Minamoto", () => {
  it("covers security, turn setup, main-phase placement, rule names, and inherited attack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          { kind: "PlaceUnder", target: { count: 1, upTo: true, from: ["trash"] }, underFilter: { isSelfRef: true } },
        ],
      },
      {
        trigger: "Rule",
        actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Takuya Kanbara", "Koji Minamoto"] }],
      },
      {
        trigger: "EndOfYourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Attack",
            attackPlayer: true,
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] },
            },
          },
        ],
      },
    ]);
  });

  it("raises placement capacity by two for each other Tamer", () => {
    expect(compiled.effects[2]).toMatchObject({
      actions: [{ kind: "PlaceUnder", target: { countModifier: { amount: 2, scaling: { unit: "cards", per: 1 } } } }],
    });
  });

  it("naturally places three distinct Hybrid cards under itself at the start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-088", as: "takuyaKoji" },
            { card: "BT14-086", as: "otherTamer" },
          ],
          trash: ["BT18-011", "BT18-012", "BT18-014"],
          hand: [{ card: "BT1-010" }],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("takuyaKoji").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT18-011", "BT18-012", "BT18-014"]),
    );
    expect(s.perm("takuyaKoji").stack).toHaveLength(3);
  });

  it("naturally plays from security when an opponent's attack reveals it", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT18-088", as: "takuyaKoji", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("takuyaKoji").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("takuyaKoji").instanceId),
    ).toBe(true);
  });

  it("naturally attacks a player at end of turn from a Hybrid host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-011", as: "host", under: ["BT18-088"] }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not grant the inherited end-of-turn attack to a non-Hybrid host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-088"] }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT18-088 Takuya Kanbara & Koji Minamoto — KB Q&A rulings", () => {
  it.fails("does not delete [AncientGreymon] reached from the end-of-turn attack, because the end-of-turn timing has passed (Q2731)", async () => {
    const chain = { attacker: "BT17-012", slide: "BT17-011", ancient: "BT17-017" };

    expect(await slideIntoAncient(chain, attackDuringMainPhase)).toEqual({
      digivolvedIntoAncient: true,
      top: undefined,
    });
    expect(await slideIntoAncient(chain, attackAtEndOfTurn)).toEqual({ digivolvedIntoAncient: true, top: "BT17-017" });
  });

  it.fails("does not delete [AncientGarurumon] reached from the end-of-turn attack, because the end-of-turn timing has passed (Q2762)", async () => {
    const chain = { attacker: "BT17-023", slide: "BT17-022", ancient: "BT17-028" };

    expect(await slideIntoAncient(chain, attackDuringMainPhase)).toEqual({
      digivolvedIntoAncient: true,
      top: undefined,
    });
    expect(await slideIntoAncient(chain, attackAtEndOfTurn)).toEqual({ digivolvedIntoAncient: true, top: "BT17-028" });
  });

  it("lets [EmperorGreymon] attack again at end of turn after its digivolve attack passed the turn and it unsuspended (Q2927)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-088",
              as: "takuyaKoji",
              under: ["BT17-011", "BT17-012", "BT17-011", "BT17-012", "BT17-022"],
            },
          ],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: [INERT, INERT, INERT, INERT, INERT],
        },
        1: {
          battleArea: [{ card: "BT1-030", as: "victim", dp: 3000, under: ["BT1-030"] }],
          security: [INERT, INERT, INERT],
          deck: [INERT, INERT, INERT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    const stackId = s.perm("takuyaKoji").permanentId;
    const victimId = s.perm("victim").permanentId;
    preferred.push(victimId);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: stackId, instanceId: s.inst("emperor").instanceId }),
    ).toEqual({ ok: true });
    await turn;

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    const attackTargets = s.events.flatMap((event) =>
      event.kind === "attackDeclared" && event.attackerPermanentId === stackId ? [event.target.kind] : [],
    );
    expect(attackTargets).toEqual(["permanent", "player"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "turnEnded" && event.endingSeat === 0)).toBe(true);
  });

  it("places up to 1 plus 2 per other Tamer [Hybrid] cards with different names from the trash (Q3045)", async () => {
    const placeFromTrash = async (otherTamers: string[]) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-088", as: "takuyaKoji" }, ...otherTamers.map((card) => ({ card }))],
            trash: [
              { card: "BT18-013", as: "nonHybrid" },
              { card: "BT18-011", as: "agunimon" },
              { card: "BT18-011", as: "duplicateAgunimon" },
              "BT18-012",
              "BT18-014",
              "BT18-022",
            ],
            deck: [INERT, INERT],
          },
          1: { deck: [INERT, INERT] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      s.state.turnSeat = 0;
      s.state.memory = 5;
      await s.ready();
      preferred.push(
        s.inst("nonHybrid").instanceId,
        s.inst("agunimon").instanceId,
        s.inst("duplicateAgunimon").instanceId,
      );
      await advance(s.engine).runTurn(0);
      return s.perm("takuyaKoji").stack.map((card) => card.cardId);
    };

    const withoutOtherTamers = await placeFromTrash([]);
    expect(withoutOtherTamers).toEqual(["BT18-011"]);

    const withOneOtherTamer = await placeFromTrash(["BT14-086"]);
    expect(withOneOtherTamer).toHaveLength(3);
    expect(new Set(withOneOtherTamer).size).toBe(3);
    expect(withOneOtherTamer).not.toContain("BT18-013");
  });

  it("cannot attack with its end-of-turn inherited effect while another Digimon's attack is in progress (Q3046)", async () => {
    const noAttackInProgress = async () => {};
    const parkAnotherAttackAtTheBlockWindow = async (s: EngineSetup) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("otherAttacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(observe(s.engine).isAttacking()).toBe(true);
    };
    const endOfTurnAttack = async (beforeEndOfTurn: (s: EngineSetup) => Promise<void>) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-011", as: "host", under: ["BT18-088"] },
              { card: "BT1-060", as: "otherAttacker" },
            ],
            deck: [INERT, INERT],
          },
          1: { battleArea: [{ card: "EX6-012", as: "blocker" }], security: [INERT, INERT, INERT] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      await s.ready();

      await beforeEndOfTurn(s);
      const firing = advance(s.engine).fireForPermanent(EffectTiming.EndOfYourTurn, s.perm("host"));
      await drainMicrotasks();
      await advance(s.engine).finishAttack();
      await firing;
      await advance(s.engine).finishAttack();
      const hostId = s.perm("host").permanentId;
      return {
        endOfTurnEffectTriggered: s.events.some(
          (event) =>
            event.kind === "effectTriggered" && event.sourcePermanentId === hostId && event.timing === "OnEndTurn",
        ),
        hostAttacked: s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === hostId),
        hostSuspended: s.perm("host").isSuspended,
        opponentSecurity: s.state.players[1]!.security.length,
      };
    };

    expect(await endOfTurnAttack(noAttackInProgress)).toEqual({
      endOfTurnEffectTriggered: true,
      hostAttacked: true,
      hostSuspended: true,
      opponentSecurity: 2,
    });
    expect(await endOfTurnAttack(parkAnotherAttackAtTheBlockWindow)).toEqual({
      endOfTurnEffectTriggered: true,
      hostAttacked: false,
      hostSuspended: false,
      opponentSecurity: 2,
    });
  });
});
