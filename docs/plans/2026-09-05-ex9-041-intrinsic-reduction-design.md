# EX9-041 intrinsic evolution reduction

EX9-041 reduces its own evolution cost by one per face-down source when the
evolving Digimon has Ver.5. Its nested Static marker was not registered as
an intrinsic reducer, so a real EX9-039 evolution with two hidden sources
incorrectly paid four memory instead of two.

Register EX9-041 in the existing verified intrinsic reducer set, alongside
EX9-031 and EX9-063. The existing collector retains the Ver.5 source filter
and hidden-source scaling; marker recognition prevents a duplicate ordinary
continuous reduction. No new reducer semantics or card handwritten behavior
is needed.

Regression proof mixes two hidden cards with one legal face-up Green level-3
source, compares Ver.5 EX9-039 with non-Ver.5 EX9-038, and checks actual
memory and retained stack after public evolution. Other EX9-041 audit clauses
remain subject to final card review.
