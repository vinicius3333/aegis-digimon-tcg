# EX9-043 alternate evolution level

The catalog requires a level-4 base for both alternate routes: Tyrannomon
in its name or the DM trait. The module and committed shared override
omitted the level on the DM branch, allowing EX9-007 (level 3) to evolve
directly into EX9-043. A public-intent regression reproduced the illegal
success before this correction.

Add `level: 4` to that branch in both authoritative runtime surfaces. The
shared override drives server legality and client projections; changing only
the card module would leave that runtime rule unchanged. No engine matching
semantics need modification.

Positive tests explicitly select alternate cost and expect three memory
paid from independent Tyrannomon-name and DM-trait level-4 bases. The level-3
negative verifies rejection before hand, permanent or memory mutation.
Other card clauses remain subject to the ongoing EX9 audit.
