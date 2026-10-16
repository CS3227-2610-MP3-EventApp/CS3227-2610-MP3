"""Compare explicitly protected paths with a reviewed Git commit (not a sandbox)."""
import argparse
import re
import subprocess
import sys
from pathlib import Path


def git(root, *args):
    result = subprocess.run(['git', '-C', str(root), *args], capture_output=True)
    if result.returncode:
        raise ValueError(result.stderr.decode('utf-8', errors='replace').strip())
    return result.stdout


def check(root, baseline, paths):
    # Literal repository-relative paths only; never allow a path outside the repo.
    if not paths or any(not p or p.startswith(('/', '\\', ':', '-')) or ':' in p or '..' in p.replace('\\', '/').split('/') for p in paths):
        raise ValueError('Supply nonempty literal repository-relative protected paths.')
    if not re.fullmatch(r'[0-9a-fA-F]{40}|[0-9a-fA-F]{64}', baseline):
        raise ValueError('Use the full immutable approved commit SHA, not a branch, tag, or abbreviation.')
    commit = git(root, 'rev-parse', '--verify', baseline + '^{commit}').decode().strip()
    literal = [':(literal)' + p.replace('\\', '/') for p in paths]
    for path in literal:
        if not git(root, 'ls-tree', '-r', '--name-only', commit, '--', path).strip():
            raise ValueError('A protected path is absent from the baseline: ' + path)
    changed = git(root, 'diff', '--name-only', '-z', commit, '--', *literal)
    staged = git(root, 'diff', '--cached', '--name-only', '-z', commit, '--', *literal)
    added = git(root, 'ls-files', '--others', '--exclude-standard', '-z', '--', *literal)
    files = sorted(set(p.decode('utf-8', errors='replace') for p in (changed + staged + added).split(b'\0') if p))
    return commit, files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', required=True, help='Recorded approved test commit SHA')
    parser.add_argument('--paths', nargs='+', required=True, help='All recorded protected files/directories')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        commit, files = check(root, args.baseline, args.paths)
    except ValueError as error:
        print('Baseline check could not run: ' + str(error), file=sys.stderr)
        return 2
    if files:
        print('Protected paths differ from approved baseline ' + commit + ':')
        print('\n'.join(files))
        return 1
    print('Protected paths match approved baseline ' + commit)
    return 0


if __name__ == '__main__':
    sys.exit(main())
