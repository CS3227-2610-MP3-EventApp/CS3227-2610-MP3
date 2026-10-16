"""Static role/TOML/local-link validation; does not prove runtime discovery."""
from pathlib import Path
import re
import sys
import subprocess
import tomllib

ROOT = Path(__file__).resolve().parents[1]
ROLES = {'orchestrator', 'specification_analyst', 'test_case_designer', 'developer', 'behaviour_verifier', 'security_reviewer'}


def main():
    errors = []
    files = list((ROOT / '.codex/agents').glob('*.toml'))
    found = set()
    for path in files:
        try:
            data = tomllib.loads(path.read_text(encoding='utf-8'))
            for key in ('name', 'description', 'developer_instructions'):
                if not isinstance(data.get(key), str) or not data[key].strip():
                    errors.append(str(path.relative_to(ROOT)) + ': missing ' + key)
            name = data.get('name')
            if not isinstance(name, str):
                errors.append('Invalid role name: ' + path.name)
                continue
            if name in found:
                errors.append('Duplicate role: ' + str(name))
            found.add(name)
            if name != path.stem:
                errors.append('Filename/role mismatch: ' + path.name)
            if set(data) - {'name', 'description', 'developer_instructions'}:
                errors.append('Unexpected agent configuration fields: ' + path.name)
        except (ValueError, OSError) as error:
            errors.append(str(path) + ': ' + str(error))
    if found != ROLES:
        errors.append('Expected exactly the six agreed roles.')
    listing = subprocess.run(['git', '-C', str(ROOT), 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], capture_output=True, check=True).stdout
    for name in set(listing.decode('utf-8').split('\0')):
        path = ROOT / name
        if not name.endswith('.md') or not path.is_file():
            continue
        for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
            if re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:', target) or target.startswith('#'):
                continue
            local = target.split('#', 1)[0].strip('<>')
            if local and not (path.parent / local).exists():
                errors.append(str(path.relative_to(ROOT)) + ': broken local link ' + target)
    if errors:
        print('\n'.join(errors))
        return 1
    print('PASS: six TOML roles and Markdown local file links. Runtime discovery is not established.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
