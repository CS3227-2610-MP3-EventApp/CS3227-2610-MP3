"""Static role/TOML/Claude Markdown/local-link validation; does not prove runtime discovery."""
from pathlib import Path
import re
import sys
import subprocess
import tomllib

ROOT = Path(__file__).resolve().parents[1]
ROLES = {'orchestrator', 'specification_analyst', 'test_case_designer', 'developer', 'behaviour_verifier', 'security_reviewer'}
CLAUDE_FIELDS = {'name', 'description', 'model', 'effort'}
CLAUDE_MODELS = {'claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-sonnet-5.5', 'claude-haiku-5-5'}
CLAUDE_EFFORTS = {'low', 'medium', 'high', 'xhigh', 'max'}


def normalize(text):
    return ' '.join(text.split())


def parse_claude_agent(text):
    """Split simple 'key: value' YAML frontmatter from the body; comment lines are ignored."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != '---':
        raise ValueError('missing frontmatter')
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == '---'), None)
    if end is None:
        raise ValueError('unterminated frontmatter')
    fields = {}
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, sep, value = line.partition(':')
        if not sep:
            raise ValueError('invalid frontmatter line: ' + line)
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
            value = value[1:-1]
        if key in fields:
            raise ValueError('duplicate frontmatter field ' + key)
        fields[key] = value
    return fields, '\n'.join(lines[end + 1:])


def main():
    errors = []
    files = list((ROOT / '.codex/agents').glob('*.toml'))
    found = set()
    codex = {}
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
            codex[name] = data
            if name != path.stem:
                errors.append('Filename/role mismatch: ' + path.name)
            if set(data) - {'name', 'description', 'developer_instructions', 'model', 'model_reasoning_effort'}:
                errors.append('Unexpected agent configuration fields: ' + path.name)
            if 'model' in data and (not isinstance(data['model'], str) or not data['model'].strip()):
                errors.append('Model must be a nonempty string: ' + path.name)
            if 'model_reasoning_effort' in data and data['model_reasoning_effort'] not in ('none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'):
                errors.append('Invalid model reasoning effort: ' + path.name)
        except (ValueError, OSError) as error:
            errors.append(str(path) + ': ' + str(error))
    if found != ROLES:
        errors.append('Expected exactly the six agreed roles.')
    claude_found = set()
    for path in (ROOT / '.claude/agents').glob('*.md'):
        rel = str(path.relative_to(ROOT))
        try:
            fields, body = parse_claude_agent(path.read_text(encoding='utf-8'))
        except (ValueError, OSError) as error:
            errors.append(rel + ': ' + str(error))
            continue
        for key in sorted(CLAUDE_FIELDS):
            if not fields.get(key):
                errors.append(rel + ': missing ' + key)
        if set(fields) - CLAUDE_FIELDS:
            errors.append('Unexpected agent configuration fields: ' + rel)
        name = fields.get('name')
        if not name:
            continue
        if name in claude_found:
            errors.append('Duplicate Claude role: ' + name)
        claude_found.add(name)
        if name != path.stem:
            errors.append('Filename/role mismatch: ' + rel)
        if fields.get('model') and fields['model'] not in CLAUDE_MODELS:
            errors.append('Invalid Claude model: ' + rel)
        if fields.get('effort') and fields['effort'] not in CLAUDE_EFFORTS:
            errors.append('Invalid Claude effort: ' + rel)
        toml = codex.get(name)
        if toml is None:
            continue
        if normalize(fields.get('description', '')) != normalize(str(toml.get('description', ''))):
            errors.append('Description differs from TOML: ' + rel)
        if normalize(body) != normalize(str(toml.get('developer_instructions', ''))):
            errors.append('Instructions differ from TOML developer_instructions: ' + rel)
    if claude_found != found:
        errors.append('Claude roles differ from TOML roles: ' + ', '.join(sorted(claude_found ^ found)))
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
    print('PASS: six TOML roles, matching Claude agent files and Markdown local file links. Runtime discovery is not established.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
