import json
from pathlib import Path

_POLICY_DIR = Path(__file__).parent


def load_policy(policy_id: str) -> dict:
    path = _POLICY_DIR / f"{policy_id.lower().replace('-', '_')}_criteria.json"
    if not path.exists():
        raise FileNotFoundError(f"No policy file found for {policy_id}")
    return json.loads(path.read_text())
