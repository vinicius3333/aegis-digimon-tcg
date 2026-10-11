# Heuristic evolution engine

This directory implements bounded JSON heuristics, deterministic legal random
decks, exact engine replay, and information-set MCTS evaluation for the official
GEPA adapter. See [the runner documentation](../../../../../tools/bot-evolution/README.md)
for training, desktop execution, provenance, and current limitations.

Build shared and API packages before invoking `evaluateCli.js`. The worker
accepts one JSON game configuration on stdin and emits one result on stdout;
application logs and MCTS progress go to stderr. `--describe` returns the
compiled engine fingerprint, supported features, seed policy, and pinned decks.

Valid fitness requires a completed game, projection verification, no rejected
intents or policy fallbacks, and every search completing its requested rollout
budget. Invalid games and timeouts have null fitness; incomplete batches stop training. Traces retain actual chosen actions,
source cards, public features, and rule contributions for GEPA reflection.
