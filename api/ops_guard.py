"""Ops is only served to network addresses on the allowlist."""

from ipaddress import ip_address, ip_network


def caller_allowed(caller: str, networks: list[str]) -> bool:
    try:
        address = ip_address(caller)
    except ValueError:
        return False
    return any(address in ip_network(n, strict=False) for n in networks)
