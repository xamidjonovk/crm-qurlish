"""Finish this project's HTTPS once its DNS points to this server (bounded one-shot job)."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

DOMAIN = "api.crmdev.uz"
EXPECTED_IPS = {"169.58.86.108", "2a02:c207:2347:509::1"}


def resolve_dns():
    # Bound libc DNS resolution in a child process as socket timeouts do not bound getaddrinfo.
    code = "import socket,json; print(json.dumps(sorted({a[4][0] for a in socket.getaddrinfo(" + repr(DOMAIN) + ",443,type=socket.SOCK_STREAM)})))"
    try:
        result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=20)
        return set(json.loads(result.stdout)) if result.returncode == 0 else set()
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        return set()


def dns_ready(addresses):
    # Avoid ACME failures from a stale A/AAAA record targeting another server.
    return bool(addresses) and addresses <= EXPECTED_IPS


def issue_certificate():
    result = subprocess.run(
        ["sudo", "-n", "/usr/local/sbin/sdp", "tls", DOMAIN],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=720,
    )
    output = result.stdout or ""
    print(output[-8000:], flush=True)
    if result.returncode == 0:
        return "issued"
    if "Let's Encrypt dry run failed" in output and "requesting the real certificate" not in output:
        return "staging_failed"
    # Never automatically retry a failed production issuance.
    return "failed"


def verify_https():
    with urllib.request.urlopen(f"https://{DOMAIN}/ready", timeout=10) as response:
        return response.status == 200


def save_status(directory, **values):
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    values.update(domain=DOMAIN, updated_at=datetime.now(timezone.utc).isoformat())
    fd, name = tempfile.mkstemp(dir=directory, prefix=".status-")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(values, stream)
        os.replace(name, directory / "status.json")
    finally:
        if os.path.exists(name):
            os.unlink(name)
    print(json.dumps(values), flush=True)


def finish(state_dir, max_wait, interval, *, resolver=resolve_dns, issuer=issue_certificate,
           verifier=verify_https, sleeper=time.sleep, now=time.time):
    state = state_dir / "status.json"
    previous = json.loads(state.read_text(encoding="utf-8")) if state.exists() else {}
    if previous.get("status") == "completed":
        print("HTTPS setup already completed; renewal is managed by the server timer", flush=True)
        return 0
    deadline = previous.get("deadline", now() + max_wait)
    staging_failures = 0
    while now() < deadline:
        addresses = resolver()
        if not dns_ready(addresses):
            save_status(state_dir, status="waiting_for_dns", addresses=sorted(addresses), deadline=deadline)
            sleeper(min(interval, max(0, deadline - now())))
            continue
        save_status(state_dir, status="requesting_certificate", addresses=sorted(addresses), deadline=deadline)
        try:
            outcome = issuer()
        except subprocess.TimeoutExpired:
            outcome = "failed"
        if outcome == "issued":
            for _ in range(6):
                try:
                    if verifier():
                        save_status(state_dir, status="completed", url=f"https://{DOMAIN}", deadline=deadline)
                        return 0
                except Exception:
                    pass
                sleeper(10)
            save_status(state_dir, status="https_verification_failed", deadline=deadline)
            return 1
        if outcome == "staging_failed":
            staging_failures += 1
            if staging_failures < 3:
                save_status(state_dir, status="waiting_for_acme_dns", attempts=staging_failures, deadline=deadline)
                sleeper(min(900, max(0, deadline - now())))
                continue
        save_status(state_dir, status="certificate_failed", deadline=deadline)
        return 1
    save_status(state_dir, status="dns_wait_expired", deadline=deadline)
    return 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state-dir", type=Path, default=Path(os.getenv("STATE_DIRECTORY", "/var/lib/crm-qurlish-https")))
    parser.add_argument("--max-wait", type=int, default=43200)
    parser.add_argument("--interval", type=int, default=300)
    parser.add_argument("--check-dns", action="store_true")
    args = parser.parse_args()
    if args.max_wait < 1 or args.interval < 1:
        parser.error("Wait and interval must be positive")
    if args.check_dns:
        addresses = resolve_dns()
        print(json.dumps({"domain": DOMAIN, "addresses": sorted(addresses), "ready": dns_ready(addresses)}))
        return 0
    return finish(args.state_dir, args.max_wait, args.interval)


if __name__ == "__main__":
    sys.exit(main())
