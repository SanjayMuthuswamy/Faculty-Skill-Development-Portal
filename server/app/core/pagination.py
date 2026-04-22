from typing import Tuple


def get_pagination_bounds(page: int, page_size: int) -> Tuple[int, int, int]:
    """
    Normlize pagination inputs and return SQL offset + normalized values.
    """
    normalized_page = max(1, page)
    normalized_page_size = max(1, min(page_size, 100))
    offset = (normalized_page - 1) * normalized_page_size
    return offset, normalized_page, normalized_page_size
