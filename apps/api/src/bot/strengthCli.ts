import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ALL_FAMOUS_DECKS, type Seat } from "@aegis/shared";
import type { BotPolicy } from "./policy.js";

// Complete real games, with presentation timers disabled exactly as in the existing benchmark.
process.env.NODE_ENV = "test";
console.log = (...values) => console.error(...values);
const { runBotMatch } = await import("./matchHarness.js");
const { createProjectedEvaluationPolicy } = await import("./projectedPolicy.js");
const { mainActionReady } = await import("./training/actions.js");
const { validateDecklist } = await import("../engine/deckValidation.js");

interface ComparisonUnit {
  id: string;
  seed: number;
  decks: [string, string];
}
interface ComparisonInput {
  baselinePolicyPath: string;
  units: ComparisonUnit[];
}

const input = JSON.parse(readFileSync(0, "utf8")) as ComparisonInput;
if (!input.baselinePolicyPath || !Array.isArray(input.units) || input.units.length === 0)
  throw new Error("Expected a frozen baseline module path and comparison units");
const { createEvaluationPolicy: createBaseline } = (await import(
  pathToFileURL(resolve(input.baselinePolicyPath)).href
)) as { createEvaluationPolicy: (options: { seed: number }) => BotPolicy };
const ids = new Set<string>();
const seeds = new Set<number>();
for (const unit of input.units) {
  if (
    !unit.id ||
    ids.has(unit.id) ||
    !Number.isInteger(unit.seed) ||
    seeds.has(unit.seed) ||
    unit.seed < 0 ||
    unit.seed > 0xffff_ffff ||
    unit.decks?.length !== 2
  )
    throw new Error("Comparison units require unique IDs, unique uint32 seeds and two deck IDs");
  ids.add(unit.id);
  seeds.add(unit.seed);
  const recipes = unit.decks.map((id) => {
    const recipe = ALL_FAMOUS_DECKS.find((deck) => deck.deckId === id);
    if (!recipe) throw new Error(`Unknown deck ${id}`);
    const legality = validateDecklist(recipe.decklist);
    if (!legality.ok) throw new Error(`Illegal deck ${id}: ${legality.reason}`);
    return recipe;
  });
  const assignments =
    unit.decks[0] === unit.decks[1]
      ? [[0, 1]]
      : [
          [0, 1],
          [1, 0],
        ];
  for (const assignment of assignments)
    for (const learnerSeat of [0, 1] as const) {
      const started = performance.now();
      const seats = ([0, 1] as const).map((seat) => ({
        deck: {
          mainDeck: [...recipes[assignment[seat]!]!.decklist.mainDeck],
          eggDeck: [...recipes[assignment[seat]!]!.decklist.eggDeck],
        },
        label: seat === learnerSeat ? "projected-balanced" : "frozen-balanced",
        policyFactory: (engine: Parameters<typeof createProjectedEvaluationPolicy>[0]["engine"], activeSeat: Seat) =>
          seat === learnerSeat
            ? createProjectedEvaluationPolicy({ engine, seat: activeSeat, seed: unit.seed + seat * 7919 })
            : createBaseline({ seed: unit.seed + seat * 7919 }),
        canChooseMainAction: mainActionReady,
      }));
      const result = await runBotMatch({
        seed: unit.seed,
        seats: [seats[0]!, seats[1]!],
        turnLimit: 60,
        captureEvents: true,
        verifyProjections: true,
      });
      const eventRejections = result.events!.filter((event) => event.kind === "actionRejected");
      const valid =
        !result.timedOut &&
        result.reason !== "stalled" &&
        result.reason !== "cancelled" &&
        result.errors.length === 0 &&
        result.rejections.length === 0 &&
        eventRejections.length === 0 &&
        result.seats.every((seat) => seat.inferenceFallbacks.error === 0 && seat.inferenceFallbacks.timeout === 0);
      const rawScore = result.winnerSeat === undefined ? 0.5 : Number(result.winnerSeat === learnerSeat);
      process.stdout.write(
        JSON.stringify({
          unit: unit.id,
          seed: unit.seed,
          decks: unit.decks,
          assignment,
          learnerSeat,
          winnerSeat: result.winnerSeat,
          rawScore,
          score: valid ? rawScore : null,
          valid,
          reason: result.reason,
          turns: result.turnCount,
          elapsedMs: performance.now() - started,
          projectionChecks: result.projectionChecks,
          learnerLatenciesMs: result.seats[learnerSeat].decisionLatenciesMs,
          baselineLatenciesMs: result.seats[learnerSeat === 0 ? 1 : 0].decisionLatenciesMs,
          inferenceFallbacks: result.seats.map((seat) => seat.inferenceFallbacks),
          ...(!valid ? { errors: result.errors, rejections: result.rejections, eventRejections } : {}),
        }) + "\n",
      );
    }
}
