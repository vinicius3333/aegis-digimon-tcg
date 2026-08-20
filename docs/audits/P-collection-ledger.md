# P collection audit ledger

Scope: committed collection P, audited in descending order from P-244 to P-001 on 2026-08-20. The committed catalog contains 243 cards: P-001..P-225 and P-227..P-244. P-226 is absent from the catalog, direct modules, and compiled IR.

Evidence path for every card: catalog `packages/shared/src/cards/data/cards.json`; local KB query `node tools/kb/query.mjs card <CARD-ID>`; direct implementation `apps/api/src/cards/P/<CARD-ID>.ts`; colocated proof `apps/api/src/cards/P/<CARD-ID>.test.ts` when present; compiled IR `packages/shared/src/effects/effects.json`.

## Inventory and rubric status

- P-244 down through P-001: 243 catalog entries, all with direct modules and compiled IR records. The collection guard is [collection.audit.test.ts](../../apps/api/src/cards/P/collection.audit.test.ts).
- Colocated behavioral tests exist for 116/243 cards. The remaining 127 cards are listed below and are not verified.
- Twenty-four compiled records contain explicit `missing-primitive(unaudited)` residuals. Those clauses are blockers and are not treated as implemented.
- No card receives 10/10. Runtime-dependent results are marked not verified because Vitest and typecheck could not run in this environment.

### Cards without colocated tests

P-244, P-243, P-242, P-241, P-240, P-239, P-238, P-237, P-236, P-235, P-232, P-231, P-230, P-229, P-228, P-227, P-225, P-224, P-223, P-222, P-221, P-219, P-218, P-217, P-216, P-215, P-213, P-212, P-211, P-210, P-209, P-208, P-207, P-205, P-204, P-203, P-202, P-201, P-200, P-198, P-197, P-196, P-195, P-194, P-193, P-192, P-191, P-190, P-189, P-188, P-187, P-186, P-185, P-184, P-183, P-182, P-181, P-180, P-178, P-177, P-176, P-175, P-173, P-170, P-168, P-167, P-166, P-165, P-164, P-163, P-162, P-161, P-160, P-159, P-157, P-155, P-154, P-153, P-152, P-151, P-150, P-149, P-148, P-147, P-146, P-145, P-144, P-142, P-141, P-140, P-139, P-138, P-137, P-136, P-135, P-134, P-133, P-132, P-131, P-129, P-128, P-127, P-126, P-125, P-124, P-122, P-121, P-120, P-119, P-118, P-117, P-116, P-115, P-114, P-113, P-112, P-111, P-110, P-109, P-108, P-107, P-106, P-105.

### Compiled IR residual blockers

- P-244: trigger when effects place [Vemmon] in an evolution stack.
- P-242: link a qualifying card from trash with cost reduced by 1.
- P-234, P-233, P-218, P-217: link-card trash/link events and memory/link follow-up effects.
- P-220: play two qualifying level-6-or-lower cards from trash without cost.
- P-215: opponent-turn protection against return/de-digivolve effects.
- P-199: replacement/reduction for playing TS Digimon cards.
- P-158, P-156: bottom-deck self-cost and color-ignoring/targeting clauses.
- P-130, P-123: breeding-to-battle movement event and follow-up memory effect.
- P-086: attack-prevention duration.
- P-085: conditional trash-based digivolution.
- P-077: reveal a purple hand card and place it on top of the deck.
- P-075: grant a temporary opponent Digimon suspension trigger.
- P-072: leave-play prevention by trashing same-level evolution cards.
- P-070: add remaining revealed cards to hand.
- P-048: memory trigger after returning a card from trash to deck.
- P-043: return Kentaurosmon to deck bottom and trigger Recovery +1.
- P-021: Palmon play plus Mimi return sequence.
- P-016: Security Attack +1.
- P-012: Draw 1 primitive residual.

## Verification gates

- `node tools/kb/query.mjs card <CARD-ID>` is available; the card-by-card evidence contract is recorded above and unresolved residuals remain explicit.
- Serial Vitest was attempted with `pnpm --filter @aegis/api exec vitest run --pool=threads --poolOptions.threads.singleThread=true src/cards/P` and was blocked by `/bin/bash: pnpm: command not found`.
- `pnpm typecheck` was not run because the same package-manager blocker prevents it. No runtime or typecheck pass is claimed.
- `git diff --check` passed for the audit guard and ledger.
- No card behavior was changed without a locally identifiable evidence basis. No other collection was edited.
