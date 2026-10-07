"""Qualify completed native imitation after failed supervisor; never train or alter it."""

import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

LAB = Path('/home/vinicius/aegis-bot-lab')
NAME = 'rule-link-current-aa2e56463-mentor-imitation-custody-r1'
RUN = LAB / 'runs' / NAME
ORIGINAL = LAB / 'transfers/rule-link-current-mentor-imitation-r3.py'
ORIGINAL_SHA = '5ac08f7961bc212fb8f4fdbdfe38860ee245a9d1085ca204addedaf2dd8edfd9'
ORIGINAL_NAME = 'rule-link-current-aa2e56463-mentor-imitation-r3'
ORIGINAL_REQUEST_SHA = 'f662b7899b1895b9e5a23a917c9aa76a38d87e337937f776f538a59ca03815da'
ORIGINAL_IDENTITY_SHA = '2ec641d36ece880361132fc76845c733df854e3f5605b98064159ee9167162a8'
ORIGINAL_GO_SHA = 'c72b637f6fa4359a4bd4f8c50bd62c738a69daa3adcd521b1359bb112903f37b'
FAILED_MAP_SHA = 'caac0ad80512fda4507c28c5032d350c35cf027af45cbaed6e2a293ee6bb4ee5'
CHECKPOINT = {'path': str(LAB / 'runs' / ORIGINAL_NAME / 'imitation/checkpoint.pt'),
    'sha256': '8f61d0c182b1c804bc4ac914f75d20ffbdce1c1988c30d15319ccd4057e84a62'}
SOURCE = 'aa2e56463176046ea5a01419d271a53a164efbae'
ENGINE = '4536a92429c1b62041212e983b63f46206dd4f2eefe959d42b3cc1a7f13c6a2c'


def require(value: bool, reason: str) -> None:
    if not value:
        raise ValueError(reason)


def helpers() -> tuple[Any, Any]:
    require(ORIGINAL.is_file() and not any(p.is_symlink() for p in (ORIGINAL, *ORIGINAL.parents)), 'Regular original source')
    require(hashlib.sha256(ORIGINAL.read_bytes()).hexdigest() == ORIGINAL_SHA, 'Original immutable source bytes')
    spec = importlib.util.spec_from_file_location('unchanged_native_imitation_checks', ORIGINAL)
    require(spec is not None and spec.loader is not None, 'Original helper loader')
    s = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(s)
    return s, s.data_module()


def request_fields(r: dict, sha: str) -> None:
    require(r == {'purpose': 'actual-cpu-only-mentor-imitation-custody-recovery', 'operatorSha256': sha,
        'sourceCommit': SOURCE, 'engineSha256': ENGINE, 'run': str(RUN), 'checkpoint': CHECKPOINT,
        'originalWholeExitCode': 1, 'failedOutputMap': {'path': str(LAB / 'transfers' / (ORIGINAL_NAME + '-failed-output-map.json')), 'sha256': FAILED_MAP_SHA},
        'wrapper': r.get('wrapper'), 'actualGamesAuthorized': 0, 'actualLearningUpdatesAuthorized': 0,
        'finalBlindSeedsAuthorized': False}, 'Exact existing-checkpoint CPU custody scope')
    require(type(r['originalWholeExitCode']) is int and type(r['actualGamesAuthorized']) is int
        and type(r['actualLearningUpdatesAuthorized']) is int and r['finalBlindSeedsAuthorized'] is False, 'Typed zero-game/update recovery')
    require(type(r['wrapper']) is dict and set(r['wrapper']) == {'path', 'sha256'}
        and r['wrapper']['path'] == str(LAB / 'transfers' / (NAME + '-launch.sh')), 'Exclusive actual recovery wrapper')


def process_same(pid: int, ticks: str) -> bool:
    path = Path('/proc') / str(pid) / 'stat'
    return path.is_file() and path.read_text(encoding='utf-8').rsplit(')', 1)[1].split()[19] == ticks


def original_args() -> argparse.Namespace:
    return argparse.Namespace(request=LAB / 'transfers' / (ORIGINAL_NAME + '-request.json'),
        request_sha=ORIGINAL_REQUEST_SHA, operator_sha=ORIGINAL_SHA, identity_sha=ORIGINAL_IDENTITY_SHA, go_sha=ORIGINAL_GO_SHA)


def failed_guard(s: Any, m: Any, r: dict, *, full: bool) -> dict:
    old = original_args()
    m.pin(old.request, old.request_sha)
    original = m.read(old.request)
    s.request_fields(m, original, ORIGINAL_SHA)
    s.snapshot(m, original, old)
    s.approved(m, original, old)
    path = LAB / 'transfers' / (ORIGINAL_NAME + '-identity.json')
    m.pin(path, ORIGINAL_IDENTITY_SHA)
    identity = m.read(path)
    require(identity['wholeWrapperPid'] == 723 and identity['startTicks'] == '58280'
        and not process_same(723, '58280') and not process_same(742, '58285')
        and not process_same(1698, '158698'), 'All exact original processes must be gone, including zombies')
    launch = Path(str(s.RUN) + '-launch')
    m.safe(launch / 'exit-code.txt')
    require((launch / 'exit-code.txt').read_bytes() == b'1\n', 'Original failed whole1 must remain failed1')
    require(not (s.RUN / 'completion.json').exists() and not (s.RUN / 'source-after.json').exists()
        and not (s.RUN / 'report.json').exists(), 'Never fabricate original success or post-source closure')
    m.pin(Path(r['failedOutputMap']['path']), FAILED_MAP_SHA)
    frozen = m.read(Path(r['failedOutputMap']['path']))
    require(frozen['originalWholeExitCode'] == 1 and frozen['failedRun'] == str(s.RUN)
        and frozen['checkpoint'] == CHECKPOINT, 'Externally observed exact failed output map')
    for name, sha in frozen['launchOutputs'].items():
        m.pin(launch / name, sha)
    if full:
        require(s.file_map(m) == frozen['outputs'], 'Complete failed directory including cache/raw/native outputs unchanged')
    else:
        for relative, sha in frozen['outputs'].items():
            if not relative.startswith('dataset/') and relative != 'imitation/encoded-samples.f32':
                m.pin(s.RUN / relative, sha)
    learner = m.read(s.RUN / 'learner-started.json')
    modules = s.modules(m)
    require(learner['pid'] == 1698 and learner['parentPid'] == 742 and learner['startTicks'] == '158698'
        and learner['modulePaths'] == {k: modules[k] for k in ('adaptation', 'features', 'imitate', 'learning_mechanisms', 'migrate', 'model')}
        and learner['operatorSha256'] == ORIGINAL_SHA and learner['identitySha256'] == ORIGINAL_IDENTITY_SHA
        and learner['requestSha256'] == ORIGINAL_REQUEST_SHA and learner['resourceGoSha256'] == ORIGINAL_GO_SHA,
        'Original actual CUDA child/module/source admission')
    return original


def runtime_guard(s: Any, m: Any) -> None:
    s.modules(m)
    manifest = m.read(m.MANIFEST)
    for relative, sha in manifest['files'].items():
        if relative.startswith(('apps/api/src/', 'packages/shared/src/', 'tools/bot-training/')) or relative == 'pnpm-lock.yaml':
            m.pin(m.CHECKOUT / relative, sha)
    path = m.MANIFEST.parent / 'runtime-files.json'
    m.pin(path, '838414a949ba0b1dbc6dc192d23f41553f147387072852612fd1206f532175d0')
    for relative, sha in m.read(path).items():
        m.pin(m.CHECKOUT / relative, sha)


def approved(m: Any, r: dict, a: argparse.Namespace) -> None:
    require(a.go_sha is not None, 'Separate ROOT CPU inspection agreement')
    path = LAB / 'transfers' / (NAME + '-ROOT-go.json')
    m.pin(path, a.go_sha)
    go = m.read(path)
    require(all(type(go.get(k)) is bool for k in ('sourceReviewed', 'resourceAgreed', 'cpuOnly', 'finalBlindSeedsAuthorized'))
        and all(type(go.get(k)) is int for k in ('actualGamesAuthorized', 'actualLearningUpdatesAuthorized')), 'Typed CPU recovery agreement')
    require(go == {'phase': r['purpose'], 'requestSha256': a.request_sha, 'operatorSha256': a.operator_sha,
        'sourceReviewed': True, 'resourceAgreed': True, 'cpuOnly': True, 'actualGamesAuthorized': 0,
        'actualLearningUpdatesAuthorized': 0, 'finalBlindSeedsAuthorized': False}, 'Exact no-game/update CPU resource agreement')


def whole(m: Any, r: dict, a: argparse.Namespace, *, closed: bool) -> None:
    require(a.identity_sha is not None, 'Actual recovery whole identity')
    path = LAB / 'transfers' / (NAME + '-identity.json')
    m.pin(path, a.identity_sha)
    identity = m.read(path)
    require(set(identity) == {'wholeWrapperPid', 'startTicks', 'run', 'operatorSha256', 'wrapperSha256'}
        and type(identity['wholeWrapperPid']) is int and type(identity['startTicks']) is str
        and identity['run'] == NAME and identity['operatorSha256'] == a.operator_sha
        and identity['wrapperSha256'] == r['wrapper']['sha256'], 'Exact recovery source/whole identity')
    m.pin(Path(str(RUN) + '-launch') / 'launch.sh', r['wrapper']['sha256'])
    if closed:
        trap = Path(str(RUN) + '-launch') / 'exit-code.txt'
        m.safe(trap)
        require(trap.read_bytes() == b'0\n' and not process_same(identity['wholeWrapperPid'], identity['startTicks']), 'Actual recovery whole0; original whole stays1')
    else:
        require(process_same(identity['wholeWrapperPid'], identity['startTicks']), 'Exact live recovery whole')
        argv = [x.decode() for x in Path('/proc', str(identity['wholeWrapperPid']), 'cmdline').read_bytes().split(b'\0') if x]
        require(len(argv) == 5 and Path(argv[0]).name == 'bash'
            and argv[1:] == [r['wrapper']['path'], a.request_sha, a.operator_sha, a.go_sha], 'Actual original wrapper argv')


def snapshot(s: Any, m: Any, r: dict, a: argparse.Namespace, *, full: bool) -> dict:
    m.pin(Path(__file__), a.operator_sha)
    m.pin(a.request, a.request_sha)
    m.pin(Path(r['wrapper']['path']), r['wrapper']['sha256'])
    original = failed_guard(s, m, r, full=full)
    runtime_guard(s, m)
    return original


def validate_native(report: dict) -> None:
    require(report['sourceCommit'] == SOURCE and report['engineSha256'] == ENGINE
        and report['checkpoint'] == CHECKPOINT and type(report['actualNewGames']) is int and report['actualNewGames'] == 0
        and type(report['selectedLearning']['selectedActorAdamUpdates']) is int
        and report['selectedLearning']['selectedActorAdamUpdates'] == 3900
        and type(report['wholeTrainingLearning']['selectedActorAdamUpdates']) is int
        and report['wholeTrainingLearning']['selectedActorAdamUpdates'] == 3900
        and type(report['selectedEpoch']) is int and report['selectedEpoch'] == 3
        and report['selectedLearning']['all12Finite'] is True
        and report['acceptedStrengthOrMastery'] is False and report['finalBlindSeedsConsumed'] is False,
        'Actual final native selected3900-step epoch3; no new optimization')


def cpu_audit(s: Any, m: Any, r: dict, a: argparse.Namespace) -> dict:
    proc = Path('/proc') / str(os.getppid())
    st = (proc / 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()
    argv = [x.decode() for x in (proc / 'cmdline').read_bytes().split(b'\0') if x]
    require(st[0] != 'Z' and st[19] == a.parent_ticks and str(Path(__file__)) in argv
        and ('--execute' in argv or '--closed' in argv) and a.request_sha in argv and a.operator_sha in argv,
        'Actual direct admitted CPU parent/ticks/argv')
    whole(m, r, a, closed=a.closed_audit)
    original = snapshot(s, m, r, a, full=False)
    m.idle()  # Always before conditional Torch import in this fresh process.
    before = m.read(s.RUN / 'source-checkpoint-before.json')
    require(s.checkpoint_view(m, Path(original['warmCheckpoint']['path']), before['metadata']) == before, 'Immutable warm model and full Adam state')
    report = s.output_report(m, original, before)
    validate_native(report)
    return report


def inspect_cpu(s: Any, m: Any, r: dict, a: argparse.Namespace) -> tuple[dict, dict]:
    ticks = Path('/proc', str(os.getpid()), 'stat').read_text(encoding='utf-8').rsplit(')', 1)[1].split()[19]
    cmd = [str(LAB / 'venv/bin/python'), '-B', str(Path(__file__)), '--cpu-audit', '--parent-ticks', ticks,
        '--request', str(a.request), '--request-sha', a.request_sha, '--operator-sha', a.operator_sha,
        '--identity-sha', a.identity_sha, '--go-sha', a.go_sha]
    if a.closed:
        cmd.append('--closed-audit')
    try:
        child = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as error:
        if a.execute:
            with (RUN / 'cpu-inspection.stdout.log').open('x', encoding='utf-8') as stream:
                stream.write(error.stdout or '')
            with (RUN / 'cpu-inspection.stderr.log').open('x', encoding='utf-8') as stream:
                stream.write(error.stderr or '')
        raise
    if a.execute:
        with (RUN / 'cpu-inspection.stdout.log').open('x', encoding='utf-8') as stream:
            stream.write(child.stdout)
        with (RUN / 'cpu-inspection.stderr.log').open('x', encoding='utf-8') as stream:
            stream.write(child.stderr)
    report = json.loads(child.stdout, object_pairs_hook=m.unique, parse_constant=m.invalid)
    return report, {'command': cmd, 'exitCode': child.returncode, 'stdoutSha256': hashlib.sha256(child.stdout.encode()).hexdigest(),
        'stderrSha256': hashlib.sha256(child.stderr.encode()).hexdigest(), 'cpuOnly': True, 'actualGames': 0, 'actualLearningUpdates': 0}


def file_map(m: Any) -> dict:
    result = {}
    for path in sorted(RUN.rglob('*')):
        m.safe(path)
        if path.is_file() and path != RUN / 'completion.json':
            result[str(path.relative_to(RUN))] = m.digest(path)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--request-sha', required=True)
    parser.add_argument('--operator-sha', required=True)
    parser.add_argument('--identity-sha'); parser.add_argument('--go-sha'); parser.add_argument('--completion-sha')
    parser.add_argument('--parent-ticks'); parser.add_argument('--closed-audit', action='store_true')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--execute', action='store_true'); mode.add_argument('--closed', action='store_true'); mode.add_argument('--cpu-audit', action='store_true')
    a = parser.parse_args(); sys.dont_write_bytecode = True
    require(__debug__ and 'torch' not in sys.modules, 'Fresh stdlib supervisor before model admission')
    require(sys.version_info[:3] == (3, 12, 14), 'Qualified actual desktop Python')
    require(subprocess.run(['node', '--version'], check=True, capture_output=True, text=True).stdout.strip() == 'v26.10.0',
        'Qualified actual Node')
    s, m = helpers()
    m.pin(a.request, a.request_sha); r = m.read(a.request); request_fields(r, a.operator_sha)
    require(a.closed == (a.completion_sha is not None), 'Externally observed recovery completion required')
    if a.cpu_audit:
        approved(m, r, a)
        print(json.dumps(cpu_audit(s, m, r, a), sort_keys=True), flush=True)
        return
    original = snapshot(s, m, r, a, full=True)
    m.idle()
    if not (a.execute or a.closed):
        print(json.dumps({'readOnly': True, 'originalImitationWholeExitCode': 1, 'checkpoint': CHECKPOINT,
            'primaryModelsImported': False, 'actualNewGames': 0, 'actualNewLearningUpdates': 0}), flush=True)
        return
    approved(m, r, a); whole(m, r, a, closed=a.closed)
    if a.closed:
        m.pin(RUN / 'completion.json', a.completion_sha)
    proof = s.producer_proof(m, original)
    require(proof == m.read(s.RUN / 'data-before.json'), 'Actual full unchanged post-source data/runtime/CP consumers')
    if a.execute:
        m.safe(RUN); require(not RUN.exists(), 'Exclusive CPU custody namespace')
        RUN.mkdir(); m.write(RUN / 'request.json', r)
        with (RUN / 'operator.py').open('xb') as f: f.write(Path(__file__).read_bytes())
        m.write(RUN / 'source-proof.json', proof)
    native, receipt = inspect_cpu(s, m, r, a)
    require('torch' not in sys.modules, 'CPU primary inspector must leave supervisor Torch-free')
    m.idle(); snapshot(s, m, r, a, full=True); whole(m, r, a, closed=a.closed)
    report = {'sourceCommit': SOURCE, 'engineSha256': ENGINE, 'originalImitationWholeExitCode': 1,
        'originalFailedOutputMapSha256': FAILED_MAP_SHA, 'imitation': native, 'checkpoint': CHECKPOINT,
        'sourceDataWholeExitCodes': proof['sourceDataWholeExitCodes'], 'actualNewGames': 0,
        'actualNewLearningUpdates': 0, 'cpuOnly': True, 'acceptedStrengthOrMastery': False, 'finalBlindSeedsConsumed': False}
    if a.closed:
        m.pin(RUN / 'operator.py', a.operator_sha)
        require(m.read(RUN / 'request.json') == r and m.read(RUN / 'source-proof.json') == proof
            and m.read(RUN / 'report.json') == report, 'Exact actual custody report and original proof')
        old_receipt = m.read(RUN / 'cpu-inspection-receipt.json')
        require(type(old_receipt['exitCode']) is int and old_receipt['exitCode'] == 0
            and old_receipt['stdoutSha256'] == receipt['stdoutSha256'] and old_receipt['cpuOnly'] is True,
            'Actual original isolated CPU inspector0 and exact native report')
        require(m.read(RUN / 'completion.json') == {'reportSha256': m.digest(RUN / 'report.json'),
            'requestSha256': a.request_sha, 'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha,
            'resourceGoSha256': a.go_sha, 'outputs': file_map(m)}, 'Actual complete new custody closure; failed original unchanged')
        print(json.dumps({'actualRecoveryWholeExitCode': 0, 'originalImitationWholeExitCode': 1,
            'completionSha256': a.completion_sha, 'report': report, 'acceptedStrengthOrMastery': False}), flush=True)
        return
    m.write(RUN / 'cpu-inspection-receipt.json', receipt); m.write(RUN / 'report.json', report)
    m.write(RUN / 'completion.json', {'reportSha256': m.digest(RUN / 'report.json'), 'requestSha256': a.request_sha,
        'operatorSha256': a.operator_sha, 'identitySha256': a.identity_sha, 'resourceGoSha256': a.go_sha, 'outputs': file_map(m)})
    print(json.dumps({'cpuCustodyInspectionComplete': True, 'originalImitationWholeExitCode': 1,
        'checkpoint': CHECKPOINT, 'completionSha256': m.digest(RUN / 'completion.json'), 'actualNewLearningUpdates': 0}), flush=True)


if __name__ == '__main__':
    main()
