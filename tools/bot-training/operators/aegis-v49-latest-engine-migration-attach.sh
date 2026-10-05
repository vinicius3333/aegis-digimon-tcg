set -euo pipefail
lab=/home/vinicius/aegis-bot-lab
test ! -e "$lab/transfers/aegis-v49-latest-engine-migration-launch-identity.json"
printf '%s  %s\n' e6dd27cb05e99a02656bfab5bf81c9c68de152db235191ac7476b79266b4c253 "$lab/transfers/aegis-v49-latest-engine-migration-launch.sh" | sha256sum -c -
bash "$lab/transfers/aegis-v49-latest-engine-migration-launch.sh" &
whole_pid=$!
"$lab/venv/bin/python" - "$whole_pid" <<'PYID'
import json,sys
from pathlib import Path
pid=int(sys.argv[1]);path=Path(f'/proc/{pid}/stat')
assert pid > 0 and path.exists()
fields=path.read_text(encoding='utf-8').split(')')[-1].split()
assert fields[0] != 'Z' and fields[19].isdigit()
receipt={'wholeWrapperPid':pid,'startTicks':fields[19],'run':'2026-10-05-bt26-ex13-v49-latest-engine-migration','operatorSha256':'bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf','wrapperSha256':'e6dd27cb05e99a02656bfab5bf81c9c68de152db235191ac7476b79266b4c253'}
identity=Path('/home/vinicius/aegis-bot-lab/transfers/aegis-v49-latest-engine-migration-launch-identity.json')
assert not identity.exists()
with identity.open('x', encoding='utf-8') as stream:
    stream.write(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt),flush=True)
PYID
wait "$whole_pid"
