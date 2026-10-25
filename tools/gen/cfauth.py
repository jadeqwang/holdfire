"""Cloudflare auth for the Hold Fire generation tools (from merge-me-back-to-main, adapted from moongazing-public-version).

Reads the wrangler OAuth token from ~/.config/.wrangler/config/default.toml at call time
(never cached on disk, never printed). If it is expired (or within 2 min of expiry), runs
`npx -y wrangler whoami`, which refreshes it, then re-reads. CLOUDFLARE_API_TOKEN, if set, wins.

Local-only ids (both gitignored, never committed; this repo is public):
  * account id: env CF_ACCOUNT_ID, else first token of <repo>/work/cf_account_id.txt
  * relay KV namespace id (used by gen.py): env GEN_KV_NS, else <repo>/work/gen_kv_ns.txt
"""
import datetime
import os
import subprocess
import tomllib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = os.path.join(ROOT, "work")
WRANGLER_CFG = os.path.expanduser(os.environ.get("WRANGLER_CONFIG", "~/.config/.wrangler/config/default.toml"))


def _local(env, fname, what):
    v = os.environ.get(env)
    if v:
        return v
    p = os.path.join(WORK, fname)
    if os.path.exists(p):
        return open(p).read().split()[0]
    raise SystemExit(f"Set {env} or put the {what} in work/{fname} (gitignored)")


if not os.environ.get("CF_ACCOUNT_ID") and os.environ.get("CLOUDFLARE_ACCOUNT_ID"):   # cloud env names it this way
    os.environ["CF_ACCOUNT_ID"] = os.environ["CLOUDFLARE_ACCOUNT_ID"]
# Claude Code cloud session: no wrangler config, the egress proxy injects the Cloudflare token for api.cloudflare.com.
if not os.environ.get("CLOUDFLARE_API_TOKEN") and not os.path.exists(WRANGLER_CFG):
    os.environ.setdefault("CF_AUTH_VIA_PROXY", "1")
ACCOUNT_ID = _local("CF_ACCOUNT_ID", "cf_account_id.txt", "Cloudflare account id")
API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}"


def kv_namespace():
    return _local("GEN_KV_NS", "gen_kv_ns.txt", "relay JOBS KV namespace id")


def _read():
    with open(WRANGLER_CFG, "rb") as f:
        d = tomllib.load(f)
    exp = d.get("expiration_time")
    exp = datetime.datetime.fromisoformat(exp.replace("Z", "+00:00")) if exp else None
    return d.get("oauth_token"), exp


def token():
    env = os.environ.get("CLOUDFLARE_API_TOKEN")
    if env:
        return env
    tok, exp = _read()
    now = datetime.datetime.now(datetime.timezone.utc)
    if not tok or (exp and exp - now < datetime.timedelta(minutes=2)):
        subprocess.run(["npx", "-y", "wrangler", "whoami"], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=180, check=False)
        tok, exp = _read()
        if not tok or (exp and exp < now):
            raise RuntimeError("wrangler OAuth token expired and refresh failed; run `npx wrangler login`")
    return tok


def headers(extra=None):
    # CF_AUTH_VIA_PROXY=1: a Claude Code cloud "network secret" — the proxy attaches the Cloudflare token for api.cloudflare.com, so the VM
    # never holds it and we send no Authorization header ourselves.
    h = {} if os.environ.get("CF_AUTH_VIA_PROXY") == "1" else {"Authorization": f"Bearer {token()}"}
    if extra:
        h.update(extra)
    return h
