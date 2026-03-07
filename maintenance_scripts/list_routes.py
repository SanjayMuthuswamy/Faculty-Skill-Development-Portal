
from app.main import app

for route in app.routes:
    # Handle APIRoute and Mount routes
    if hasattr(route, 'path'):
        print(f"Path: {route.path}, Name: {route.name}, Methods: {getattr(route, 'methods', None)}")
    elif hasattr(route, 'routes'):
        for sub_route in route.routes:
            print(f"Mount Path: {route.path} -> {sub_route.path}")
