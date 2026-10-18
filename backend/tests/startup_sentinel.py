from __future__ import annotations

import builtins


_import = builtins.__import__


def _reject_application_or_driver_import(name, *args, **kwargs):
    if name == "app" or name.startswith("app.") or name == "psycopg" or name.startswith("psycopg."):
        raise AssertionError(f"test database guard imported forbidden module: {name}")
    return _import(name, *args, **kwargs)


builtins.__import__ = _reject_application_or_driver_import
