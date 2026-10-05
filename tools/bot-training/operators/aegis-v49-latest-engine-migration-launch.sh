set -euo pipefail
source /home/vinicius/aegis-bot-lab/env.sh
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
lab=/home/vinicius/aegis-bot-lab
launch="$lab/runs/2026-10-05-bt26-ex13-v49-latest-engine-migration-launch"
test ! -e "$launch"
mkdir "$launch"
trap 'code=$?; printf "%s\n" "$code" > "$launch/exit-code.txt"' EXIT
cp "$lab/transfers/aegis-v49-latest-engine-migration-launch.sh" "$launch/launch.sh"
printf '%s  %s\n' bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf "$lab/transfers/aegis-v49-latest-engine-migration.py" | sha256sum -c -
"$lab/venv/bin/python" -u "$lab/transfers/aegis-v49-latest-engine-migration.py" bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf > "$launch/launch.log" 2>&1
cat "$lab/runs/2026-10-05-bt26-ex13-v49-latest-engine-migration/completion.json"
