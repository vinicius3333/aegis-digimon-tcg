import { describe, it, expect } from "vitest";
import { EffectTiming, type Seat, type ServerEvent } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { WinCheck } from "../security/winCheck.js";
import { runSecurityCheck, type SecurityCheckDeps, type SecurityCheckAttacker } from "../security/securityCheck.js";
import { makeSecurityState, makeSecurityCard } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 13 "Security Checks" (comprehensive-0152-0154).
 *
 * comprehensive-0152 (bare chapter heading) and the TOC dot-leader entry
 * (comprehensive-0013) carry no normative content and are seeded in `not-testable.ts`; the
 * real content chunks are comprehensive-0153 and -0154.
 */

const ATTACKER_ID = "attacker-1";
const attacker: SecurityCheckAttacker = { permanentId: ATTACKER_ID };

interface Harness {
  state: ReturnType<typeof makeSecurityState>;
  win: WinCheck;
  events: ServerEvent[];
  deps: SecurityCheckDeps;
  deleted: string[][];
  firedTimings: EffectTiming[];
}

/** Mirrors `security/securityCheck.test.ts`'s own harness shape, reusing the testkit's shared
 * `makeSecurityState`/`makeSecurityCard` board builders per the file-ownership instructions. */
function harness(
  securityCards: ReturnType<typeof makeSecurityCard>[],
  overrides: Partial<SecurityCheckDeps> = {},
): Harness {
  const state = makeSecurityState(securityCards, ATTACKER_ID);
  const events: ServerEvent[] = [];
  const win = new WinCheck(state, (e) => events.push(e));
  const deleted: string[][] = [];
  const firedTimings: EffectTiming[] = [];

  const attackerLives = (): boolean =>
    state.players[0]?.battleArea.some((p) => p.permanentId === ATTACKER_ID) ?? false;

  const deps: SecurityCheckDeps = {
    strikeFor: () => 1,
    permanentById: (id) =>
      id === ATTACKER_ID && attackerLives()
        ? state.players[0]?.battleArea.find((p) => p.permanentId === id)
        : undefined,
    fireTiming: async (timing) => {
      firedTimings.push(timing);
    },
    resolveSecurityEffect: async () => false,
    dpOf: () => 5000,
    securityCardDp: () => 3000,
    isDigimon: () => false,
    deletePermanents: async (ids) => {
      deleted.push(ids);
      const ba = state.players[0]?.battleArea;
      if (ba) {
        for (const id of ids) {
          const idx = ba.findIndex((p) => p.permanentId === id);
          if (idx >= 0) ba.splice(idx, 1);
        }
      }
    },
    ...overrides,
  };

  return { state, win, events, deps, deleted, firedTimings };
}

describe("§13-1 Security Checks (comprehensive-0153)", () => {
  it("13-1-1/13-1-4: a security check on the opponent's security stack is mandatory whenever it applies", async () => {
    cite("comprehensive-0153", "13-1-1 a security check performs a check on the opponent's security stack; 13-1-4 it is mandatory");

    const card = makeSecurityCard(1, 0, "OPTION-X");
    const h = harness([card]);
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    // No opt-out surface exists — the check ran and consumed the top card unconditionally.
    expect(card.faceUp).toBe(true);
    expect(h.state.players[1]?.security).toHaveLength(0);
  });

  it("13-1-2: exactly 1 security check is performed per attack (Strike 1), regardless of remaining security", async () => {
    cite(
      "comprehensive-0153",
      "13-1-2 only 1 security check is performed per attack, unless the checked-card count is " +
        "modified by an effect on the attacker",
    );

    const cards = [makeSecurityCard(1, 0), makeSecurityCard(1, 1)];
    const h = harness(cards);
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.state.players[1]?.security).toHaveLength(1); // only the TOP card was checked
    expect(cards[1]!.faceUp).toBe(false); // the second card was never touched
  });

  it("13-1-2 (modified Strike): a raised check count (＜Security Attack +N＞-style) checks that many cards in ONE security check", async () => {
    cite(
      "comprehensive-0153",
      "13-1-2 if the number of cards that can be checked is modified by an effect on the " +
        "attacking Digimon, the modified number is checked in a single security check",
    );

    const cards = [makeSecurityCard(1, 0), makeSecurityCard(1, 1), makeSecurityCard(1, 2)];
    const h = harness(cards, { strikeFor: () => 2 });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.state.players[1]?.security).toHaveLength(1); // 2 of the 3 were checked
    expect(cards[0]!.faceUp).toBe(true);
    expect(cards[1]!.faceUp).toBe(true);
    expect(cards[2]!.faceUp).toBe(false);
  });

  it("13-1-3: a security check is performed one card at a time — each is fully resolved before the next begins", async () => {
    cite("comprehensive-0153", "13-1-3 a security check is performed one card at a time");

    const order: string[] = [];
    const cards = [makeSecurityCard(1, 0, "AD1-001"), makeSecurityCard(1, 1, "AD1-002")];
    const h = harness(cards, {
      strikeFor: () => 2,
      fireTiming: async (_timing, info) => {
        order.push(info.securityInstanceId);
      },
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    // OnSecurityCheck AND OnLoseSecurity both fire for card 0 before card 1 is even revealed.
    expect(order).toEqual([cards[0]!.instanceId, cards[0]!.instanceId, cards[1]!.instanceId, cards[1]!.instanceId]);
  });

  it("13-1-3: re-evaluates the live check count after each resolved card", async () => {
    cite(
      "comprehensive-0153",
      "13-1-3 each card is fully resolved before the next security card is checked",
    );

    const cards = [makeSecurityCard(1, 0), makeSecurityCard(1, 1)];
    let liveStrike = 2;
    const h = harness(cards, {
      strikeFor: () => liveStrike,
      fireTiming: async (timing, info) => {
        if (timing === EffectTiming.OnLoseSecurity && info.securityInstanceId === cards[0]!.instanceId) {
          liveStrike = 1;
        }
      },
    });

    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(cards[0]!.faceUp).toBe(true);
    expect(cards[1]!.faceUp).toBe(false);
    expect(h.state.players[1]!.security.map((card) => card.instanceId)).toEqual([cards[1]!.instanceId]);
  });

  it("13-1-5: if the checking Digimon leaves play mid-check, no further security checks are performed", async () => {
    cite("comprehensive-0153", "13-1-5 if the Digimon performing the security check is removed from the battle area, it can't check any more");

    const cards = [makeSecurityCard(1, 0), makeSecurityCard(1, 1)];
    const h = harness(cards, {
      strikeFor: () => 2,
      fireTiming: async (timing, info) => {
        h.firedTimings.push(timing);
        if (timing === EffectTiming.OnLoseSecurity && info.securityInstanceId === cards[0]!.instanceId) {
          // Remove the attacker between the first and second checks.
          h.state.players[0]!.battleArea = h.state.players[0]!.battleArea.filter(
            (p) => p.permanentId !== ATTACKER_ID,
          ) as never;
        }
      },
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(cards[0]!.faceUp).toBe(true); // the first check ran
    expect(cards[1]!.faceUp).toBe(false); // the second never happened — the attacker was gone
  });

  it("13-1-6: a checked card leaves the security stack immediately — before any battle against it resolves", async () => {
    cite("comprehensive-0153", "13-1-6 a checked card is removed from the security stack and treated as not being in any particular area");

    const card = makeSecurityCard(1, 0, "AD1-002");
    let inSecurityDuringBattle: boolean | undefined;
    const h = harness([card], {
      isDigimon: () => true,
      dpOf: () => 9000, // attacker wins the battle
      securityCardDp: () => 1000,
      deletePermanents: async (ids) => {
        h.deleted.push(ids);
      },
    });
    // Read the zone from inside `dpOf` — called only during the battle-compare step, which
    // §13-1-8-3 places AFTER the card already left the security stack (§13-1-6).
    h.deps.dpOf = (id) => {
      if (id === ATTACKER_ID) inSecurityDuringBattle = h.state.players[1]?.security.some((c) => c.instanceId === card.instanceId);
      return 9000;
    };
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(inSecurityDuringBattle).toBe(false); // already gone from security by battle time
    expect(h.state.players[1]?.security.some((c) => c.instanceId === card.instanceId)).toBe(false);
  });

  it("13-1-7/13-1-8-3-1: a checked Digimon card battles the attacker as a Security Digimon", async () => {
    cite(
      "comprehensive-0153",
      "13-1-7 a checked Digimon card is treated as a Security Digimon; 13-1-8-3-1 a battle " +
        "occurs between the Security Digimon and the checking Digimon",
    );

    const card = makeSecurityCard(1, 0, "AD1-002");
    const h = harness([card], { isDigimon: () => true, dpOf: () => 1000, securityCardDp: () => 3000 });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    // The attacker (1000 DP) loses to the Security Digimon (3000 DP) — a real battle happened.
    expect(h.deleted).toEqual([[ATTACKER_ID]]);
    expect(h.state.players[0]?.battleArea.some((p) => p.permanentId === ATTACKER_ID)).toBe(false);
  });

  it("13-1-8-2: an effect triggered by the security check is fully resolved before the next action begins", async () => {
    cite("comprehensive-0153", "13-1-8-2-1 an effect triggered by a security check is resolved before the next action begins");

    const order: (EffectTiming | string)[] = [];
    const card = makeSecurityCard(1, 0);
    const h = harness([card], {
      fireTiming: async (timing) => {
        order.push(timing);
      },
      resolveSecurityEffect: async () => {
        order.push("resolveSecurityEffect");
        return false;
      },
    });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    // OnSecurityCheck resolves fully (including any [Security] effect activation) BEFORE
    // OnLoseSecurity (the "next action") begins.
    const idxCheck = order.indexOf(EffectTiming.OnSecurityCheck);
    const idxEffect = order.indexOf("resolveSecurityEffect");
    const idxLose = order.indexOf(EffectTiming.OnLoseSecurity);
    expect(idxCheck).toBeLessThan(idxEffect);
    expect(idxEffect).toBeLessThan(idxLose);
  });
});

describe("§13-1-8-3-2 Security Checks, cont'd (comprehensive-0154)", () => {
  it("13-1-8-3-2: with no Security Digimon (a non-Digimon check), the flow proceeds straight to the next step without a battle", async () => {
    cite("comprehensive-0154", "13-1-8-3-2 if a Security Digimon isn't present, proceed to the next step");

    const card = makeSecurityCard(1, 0, "OPTION-X");
    const h = harness([card], { isDigimon: () => false });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.deleted).toEqual([]); // no battle => no deletePermanents call at all
    expect(h.state.players[0]?.battleArea.some((p) => p.permanentId === ATTACKER_ID)).toBe(true); // attacker survives untouched
  });

  it("13-1-8-4: a revealed card is trashed unless an effect already relocated it to an area", async () => {
    cite("comprehensive-0154", "13-1-8-4 a card revealed from a security check is placed in the trash unless it belongs to an area");

    const stays = makeSecurityCard(1, 0, "OPTION-X");
    const relocated = makeSecurityCard(1, 1, "OPTION-X");
    const h1 = harness([stays]);
    await runSecurityCheck(h1.state, () => {}, h1.win, h1.deps, 1, attacker);
    expect(h1.state.players[1]?.trash.some((c) => c.instanceId === stays.instanceId)).toBe(true);

    // A [Security] effect that plays the card (moves it to another area, e.g. the battle area)
    // BEFORE this function's own trash step must leave it OUT of the trash.
    const h2 = harness([relocated], {
      resolveSecurityEffect: async (card) => {
        h2.state.players[1]!.hand.push(card); // pretend a [Security] effect relocated it to hand
        return true;
      },
    });
    await runSecurityCheck(h2.state, () => {}, h2.win, h2.deps, 1, attacker);
    expect(h2.state.players[1]?.trash.some((c) => c.instanceId === relocated.instanceId)).toBe(false);
    expect(h2.state.players[1]?.hand.some((c) => c.instanceId === relocated.instanceId)).toBe(true);
  });

  it("13-1-8-5: if the checking Digimon can perform another security check, it does — the Strike loop continues", async () => {
    cite("comprehensive-0154", "13-1-8-5 if the card performing the security check can perform another, it does");

    const cards = [makeSecurityCard(1, 0), makeSecurityCard(1, 1), makeSecurityCard(1, 2)];
    const h = harness(cards, { strikeFor: () => 3 });
    await runSecurityCheck(h.state, () => {}, h.win, h.deps, 1, attacker);

    expect(h.state.players[1]?.security).toHaveLength(0); // all 3 were checked in the same attack
    expect(cards.every((c) => c.faceUp)).toBe(true);
  });
});
