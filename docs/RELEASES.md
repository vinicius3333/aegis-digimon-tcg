# Releases

Aegis follows Semantic Versioning from the production baseline **1.0.0**.

## Commit format

Every commit in a pull request must use Conventional Commits:

```text
feat(lobby): add private match invitations
fix(deck): prevent an invalid deck from queuing
feat(api)!: remove the legacy room protocol
```

`feat:` produces a minor release, `fix:` and `perf:` a patch release, and `!`
or a `BREAKING CHANGE:` footer a major release. `docs:`, `test:`, `refactor:`,
`chore:`, `ci:` and the other supported conventional types do not release by
themselves. The CI checks each PR commit against this format.

## Release PR

1. A maintainer reviews the complete diff and all commits after the latest
   `v*` tag. It must challenge a commit type when its actual compatibility
   impact calls for a larger SemVer bump.
2. Run `pnpm release:prepare`. Pass `major`, `minor` or `patch` only when the
   reviewed impact warrants a higher bump than the command detects.
3. The command synchronizes package versions, updates `releases.json`,
   regenerates `CHANGELOG.md` and the release data displayed in the web app.
4. Run `pnpm check:release`, the relevant tests and open a dedicated release
   PR. Review the version and human-readable changelog before merging.
5. Once the approved release is deployed to production, create the matching
   immutable Git tag, for example `v1.1.0`.

Pushing to `master` triggers Dokploy's repository webhook. Dokploy builds
`docker-compose.dokploy.yml` on the VPS and replaces the direct API/web compose
services. GitHub Actions is disabled. This fallback does not preserve in-memory
matches across a rollout; schedule production pushes accordingly.

The first deployed baseline must be tagged `v1.0.0` before the next release PR.
`releases.json` is the source of truth; do not hand-edit its generated outputs.

## Localized release notes

The `description` of each change remains the English source for `CHANGELOG.md`.
To localize a note in the client, add an optional `translations` map to that
change in `releases.json`, keyed by locale (for example, `"pt-BR"`). The
client falls back to the English description when a translation is absent.
After changing translations without preparing a new release, run
`pnpm release:sync` to regenerate the web release data and changelog.
