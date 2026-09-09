# EX9 type-safety and fuzzing design

## Goal

Remove every `@ts-nocheck` directive from the 74 EX9 card modules and make the compiled IR conform to the shared TypeScript model without weakening that model. Add deterministic, reproducible fuzz tests that exercise EX9 through public engine intents and fail with enough seed/case information to replay a defect.

## Type-safety approach

The card catalog and `CompiledCard` union remain the source of truth. All 69 directives are removed in one mechanical pass, then workspace typecheck provides the complete error inventory. Each error is resolved at the narrowest correct layer: malformed generated IR is corrected in the card module; a shared type is changed only when runtime support and multiple valid producers prove the model itself is incomplete. No casts to `any`, blanket suppressions, or replacement ignore directives are accepted. Persisted effects are synchronized after the modules compile, and the final scan must find zero `@ts-nocheck` directives anywhere in `apps/api/src/cards/EX9`.

## Fuzzing approach

Add an EX9-focused Vitest suite with an internal seeded pseudo-random generator, avoiding a new dependency. Cases use legal deck/egg fixtures and public `GameEngine` intents. The initial properties target high-risk shared mechanisms represented throughout EX9: optional payment acceptance/refusal must preserve card conservation; failed or declined costs must not partially mutate zones; once-per-turn effects must not fire twice and must reset only at the correct turn boundary; and generated sequences must preserve engine-wide identity, ownership, memory, and zone-uniqueness invariants. Runs use fixed seed families in CI, while an environment override permits exact reproduction and additional local cases. Any failure reports the seed and case index.

## Verification

Required gates are zero EX9 suppressions, green workspace typecheck, green focused fuzz suite, green complete EX9 collection, green engine mechanisms, synchronized persisted effects with no changes outside EX9, scoped Oxlint/Oxfmt, and clean `git diff --check`. Commits separate the design, type corrections, fuzz coverage, and synchronized artifacts.
