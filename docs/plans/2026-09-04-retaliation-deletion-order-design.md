# Retaliation after effective battle deletion

EX9-065 reproduces an invalid Retaliation deletion when Scapegoat saves its
holder. CR 16-13 requires the holder alone to be deleted in battle.

The combat controller must resolve battle deletion prevention before deciding
whether Retaliation triggered. It snapshots the surviving opponent permanent ID
against the deleted holder's top-card instance ID and carries that internal
metadata with the actual battle-deletion event. The ordinary effect collector
adds one mandatory Retaliation reaction to the same On Deletion window. The
reaction uses the normal effect-deletion primitive, retaining effect ownership,
immunity, generic prevention and nested deletion handling.

Rejected alternatives: filtering a precomputed Retaliation victim after all
prevention still offers invalid costs to that victim; executing Retaliation in
a separate unconditional post-battle pass loses ordering with On Deletion.

Verify the EX9-065 red case, normal losing-block Retaliation, battle ties,
prevention interactions, effect-only deletion provenance and ordering. Keep
unresolved regressions visible; do not close the collection from the first green.
