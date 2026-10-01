"""The sandbox settings: R6, the Write rule every writing lane needs."""

import dataclasses

from tests.support import mini_factory as mini
from tools.diff_policy.check import load_lane
from tools.factory import sandbox
from tools.factory.config import all_contracts, load_contract


def rules(repo, agent, lane, **changes):
    contract = dataclasses.replace(load_contract(agent, repo), **changes)
    settings = sandbox.settings_for(repo, load_lane(lane, repo), contract, False, repo, ["main"])
    allow = settings["permissions"]["allow"]
    return [r for r in allow if r.startswith(("Edit(", "Write("))]


def test_r6_a_write_only_contract_gets_edit_beside_every_write(tmp_path):
    repo = mini.build(tmp_path)
    granted = rules(repo, "reviewer", "L-review")
    assert "Edit" not in load_contract("reviewer", repo).tools
    writes = [r for r in granted if r.startswith("Write(")]
    assert writes
    for rule in writes:
        assert "Edit(" + rule.removeprefix("Write(") in granted


def test_r6_every_writing_lane_is_given_edit(tmp_path):
    repo = mini.build(tmp_path)
    for contract in all_contracts(repo):
        if not contract.may_write or contract.retired:
            continue
        for lane in contract.lanes:
            granted = rules(repo, contract.name, lane)
            for rule in (r for r in granted if r.startswith("Write(")):
                assert "Edit(" + rule.removeprefix("Write(") in granted, (contract.name, lane)


def test_r6_no_file_rules_without_the_right_to_write(tmp_path):
    repo = mini.build(tmp_path)
    assert rules(repo, "reviewer", "L-review", may_write=False) == []
    only_edit = rules(repo, "builder", "L-engine", tools=("Read", "Edit", "Bash"))
    assert only_edit
    assert all(r.startswith("Edit(") for r in only_edit)
