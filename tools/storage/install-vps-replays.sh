#!/usr/bin/env bash
# Additive install: does not recreate the gateway, database or application containers.
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then echo 'Run as root on the VPS.' >&2; exit 1; fi
replay_source_root=$(cd "$(dirname "$0")/../.." && pwd)
replay_data_root=${AEGIS_REPLAY_DATA_ROOT:-/opt/aegis-replays}
replay_rollout_root=${AEGIS_ROLLOUT_STATE:-/opt/aegis-rollout}
replay_network=${AEGIS_REPLAY_NETWORK:-aegis_default}
export AEGIS_REPLAY_DATA_ROOT="$replay_data_root" AEGIS_REPLAY_NETWORK="$replay_network"
docker network inspect "$replay_network" >/dev/null
install -d -m 700 "$replay_data_root" "$replay_data_root/meta" "$replay_data_root/data" "$replay_data_root/snapshots"

# Generate only once; an install rerun must preserve the bucket, credentials and data.
python3 - "$replay_data_root" "$replay_rollout_root" <<'PY'
import json, os, secrets, sys
from pathlib import Path
data, rollout = map(Path, sys.argv[1:])
os.umask(0o077)
env = data / 'garage.env'
api = rollout / 'replay-storage.json'
if env.exists():
    settings = dict(line.split('=', 1) for line in env.read_text().splitlines() if '=' in line)
else:
    if api.exists():
        raise SystemExit('Replay API configuration already exists without Garage credentials; refusing to replace it.')
    settings = {'GARAGE_RPC_SECRET': secrets.token_hex(32), 'GARAGE_DEFAULT_ACCESS_KEY': 'GK' + secrets.token_hex(16), 'GARAGE_DEFAULT_SECRET_KEY': secrets.token_hex(32), 'GARAGE_DEFAULT_BUCKET': 'aegis-replays'}
    env.write_text(''.join(f'{k}={v}\n' for k, v in settings.items()))
config = {'AEGIS_REPLAY_S3_ENDPOINT': 'http://aegis-replay-s3:3900', 'AEGIS_REPLAY_S3_BUCKET': settings['GARAGE_DEFAULT_BUCKET'], 'AEGIS_REPLAY_S3_REGION': 'garage', 'AEGIS_REPLAY_S3_ACCESS_KEY': settings['GARAGE_DEFAULT_ACCESS_KEY'], 'AEGIS_REPLAY_S3_SECRET_KEY': settings['GARAGE_DEFAULT_SECRET_KEY']}
if api.exists():
    if json.loads(api.read_text()) != config:
        raise SystemExit('Installed replay configuration differs; refusing to overwrite it.')
(data / 'api-config.json').write_text(json.dumps(config) + '\n')
os.chmod(env, 0o600)
os.chmod(data / 'api-config.json', 0o600)
toml = data / 'garage.toml'
if not toml.exists():
    toml.write_text('''metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
metadata_snapshots_dir = "/var/lib/garage/snapshots"
metadata_auto_snapshot_interval = "6h"
db_engine = "sqlite"
replication_factor = 1
data_fsync = true
rpc_bind_addr = "127.0.0.1:3901"
rpc_public_addr = "127.0.0.1:3901"
[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:3900"
''')
os.chmod(toml, 0o600)
PY
docker compose -p aegis-replays -f "$replay_source_root/docker-compose.replays.yml" up -d --wait --wait-timeout 60
docker exec aegis-replay-storage /garage bucket set-quotas aegis-replays --max-size 20GB --max-objects 100000
install -m 600 "$replay_data_root/api-config.json" "$replay_rollout_root/.replay-storage.json.tmp"
mv "$replay_rollout_root/.replay-storage.json.tmp" "$replay_rollout_root/replay-storage.json"
echo 'Private replay S3 installed. Future application generations read replay-storage.json.'
