"""Every lane is told the whole picture before its own part."""

from tools.factory.agent_run import own_part
from tools.factory.phase import SANDBOX_NOTE, briefing


def test_a_lane_sees_the_goal_and_the_lanes_beside_it():
    rnd = {
        "lanes": [
            {"lane": "L-engine", "mission": "Mark the stages\n  a petition nulled."},
            {"lane": "L-web", "mission": "Show the DSO line only on those rows."},
        ]
    }
    text = briefing({"goal": "Fix the  Timeline regression."}, rnd, rnd["lanes"][0])
    assert text == (
        "The whole picture: Fix the Timeline regression.\n\n"
        "Beside you in this round: L-web: Show the DSO line only on those rows.\n\n"
        f"{SANDBOX_NOTE}\n\n"
        "Your part: Mark the stages a petition nulled."
    )


def test_a_lone_lane_with_no_goal_gets_its_part_only():
    rnd = {"lanes": [{"lane": "L-tests", "mission": "Write tests."}]}
    assert briefing({}, rnd, rnd["lanes"][0]) == f"{SANDBOX_NOTE}\n\nYour part: Write tests."


def test_cards_and_commits_show_the_lanes_own_part():
    assert own_part("The whole picture: X.\n\nYour part: Write tests.") == "Write tests."
    assert own_part("Write tests.") == "Write tests."


def test_every_lane_is_told_the_socket_wall_is_not_a_fault_and_its_part_stays_its_own():
    # W1 L-api and W2-P1 L-tests each stopped on the sandbox refusing a socket bind.
    rnd = {"lanes": [{"lane": "L-tests", "mission": "Write tests."}]}
    text = briefing({"goal": "G."}, rnd, rnd["lanes"][0])
    assert "do not escalate for it" in SANDBOX_NOTE
    assert SANDBOX_NOTE in text
    assert own_part(text) == "Write tests."
