from smartpay.transfers.corridors import (
    destination_available,
    get_corridor,
    list_destinations,
    operator_allowed,
    operators_for,
)


def test_valid_countries_and_operators():
    assert destination_available("SN")
    assert destination_available("CI")
    assert destination_available("CG")
    assert destination_available("CM")
    assert destination_available("BJ")
    assert destination_available("TG")
    assert operator_allowed("SN", "wave")
    assert operator_allowed("SN", "orange")
    assert operator_allowed("SN", "free")
    assert operator_allowed("CI", "mtn")
    assert operator_allowed("CG", "airtel")
    assert operator_allowed("CM", "mtn")
    assert operator_allowed("BJ", "moov")
    assert operator_allowed("TG", "tmoney")


def test_incompatible_operator_rejected():
    assert operator_allowed("SN", "airtel") is False
    assert operator_allowed("CG", "wave") is False
    assert operators_for("FR") == ()


def test_france_unavailable():
    france = get_corridor("FR")
    assert france is not None
    assert france.available is False
    assert destination_available("FR") is False
    assert all(item.simulated_gateway for item in list_destinations())
