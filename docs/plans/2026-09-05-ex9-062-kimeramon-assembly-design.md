# SkullGreymon and Kimeramon Assembly

The official EX9-074 card listing specifies Assembly -7 with seven differently
named level-four DM Digimon. The local catalog, module, and shared requirements
omitted this recipe. A real play with EX9-062 and six eligible peers failed with
`not-assembly` before adding the recipe.

Source: https://world.digimoncard.com/cards/?card_no=EX9-074&search=true

EX9-062's printed rule adds level four specifically for Kimeramon's Assembly.
The old matcher unconditionally replaced its level with four, incorrectly rejecting
its printed level five for other Assembly recipes. A focused matcher regression
reproduced this failure.

Pass the played card definition into material matching. Permit EX9-062's additional
level only when the destination's exact name is Kimeramon; retain the printed level
and leave the shared catalog definition unchanged. Add the Assembly recipe to the
EX9-074 module and shared override, and restore its catalog special-play text.

The public test proves seven materials, top-first declaration order, and memory
5 to 2 after the seven-point reduction. Focused matcher tests distinguish Kimeramon,
another destination, and no destination context. Further collection gates and effects
synchronization remain pending at EX9 closeout.

Final EX9-062 focused proof: 21 tests, including invalid Assembly declarations,
normal/alternate evolution, newly milled recovery, explicit refusals, and battle
deletion free play. The earlier combined EX9-062/074/matcher run passed 32 tests
before the final On Play refusal addition. Eleven selected Assembly conformance
tests and full shared/API/web typecheck also passed. Only EX9-074 catalog text
changed; the rest of the catalog is preserved.
