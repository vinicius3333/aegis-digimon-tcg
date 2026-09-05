# EX9-045 DNA requirements

The [official Cernumon card entry](https://world.digimoncard.com/cards/?card_no=EX9-045&search=true)
specifies zero-cost DNA from Green/Yellow level 6 plus Blue/Purple level 6.
The committed catalog, card module and shared requirements omitted that
clause. The existing no-DNA-requirement fallback used normal evolution cost:
a real legal Green/Blue pair incorrectly paid five memory, reproduced by
the new focused test before this correction.

Restore the catalog clause and declare all four color combinations in the
card IR and existing shared DNA override map. This confines the correction
to Cernumon rather than changing the behavior of unrelated cards with
missing DNA metadata. The generic fallback remains a separate audit risk.

Runtime cases exercise all four combinations, two distinct multi-color
Hydramon materials, and reject a level-5 partner or wrong-color pair without
mutation. Successful DNA is unsuspended, retains both materials, draws one
card, and pays zero. EX9-044's earlier synthetic event fixtures now use two
level-6 Hydramon instead of an illegal level-5 Toropiamon partner.

Public EX9-044 self-play and self-evolution scenarios also verify Q4799 and
Q4800, including the resulting zero-cost DNA, carried materials and mandatory
draws. This correction does not close the collection.
