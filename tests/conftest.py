"""The `mutants` Hypothesis profile of specs/step-w/SPEC-W2-UNKNOWN.md point 52: the review round
runs the mutant script with `--hypothesis-profile mutants`, 10 examples per property. Registered
here, before pytest_configure loads the profile. tests/support/gaps.py reads the profile's
name to size the properties, since each property sets max_examples itself.

Under that profile the non-vacuity test of point 44 is skipped (review w2-unknown finding 4):
10 examples cannot reach its floor of 5 changes per output kind, so it would fail with no
mutant and every mutant would read as killed.
"""

import pytest
from hypothesis import settings

settings.register_profile("mutants", max_examples=10, deadline=None, derandomize=True)

NON_VACUITY = "test_the_properties_saw_each_output_kind_known_and_changed"


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    if settings.get_current_profile_name() != "mutants":
        return
    skip = pytest.mark.skip(reason="point 44's floor is for 30 examples, not the mutants profile")
    for item in items:
        if item.name == NON_VACUITY:
            item.add_marker(skip)
