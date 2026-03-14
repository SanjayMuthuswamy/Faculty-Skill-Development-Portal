from app.core.pagination import get_pagination_bounds


def test_get_pagination_bounds_standard_values():
    offset, page, page_size = get_pagination_bounds(page=3, page_size=20)
    assert offset == 40
    assert page == 3
    assert page_size == 20


def test_get_pagination_bounds_clamps_invalid_values():
    offset, page, page_size = get_pagination_bounds(page=0, page_size=999)
    assert offset == 0
    assert page == 1
    assert page_size == 100
