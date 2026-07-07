from datetime import datetime
from logging.config import fileConfig

from alembic import context
from alembic.operations import ops as alembic_ops
from sqlalchemy import Column, engine_from_config, pool
from sqlmodel import SQLModel

# Import all models so they register on SQLModel.metadata.
import src.models  # noqa: F401
from src.settings import get_settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = SQLModel.metadata


# Order in which columns are emitted inside every generated `op.create_table`.
# Base columns from `BaseModel` come first, then any foreign key column, then
# the rest of the model's own fields in their declared order.
_BASE_COLUMN_ORDER = {
    "id": 0,
    "enabled": 1,
    "created_at": 2,
    "updated_at": 3,
    "deleted_at": 4,
}


def _column_sort_key(item, original_index):
    if not isinstance(item, Column):
        # Constraints (PrimaryKey, ForeignKey, Unique, …) stay after the columns.
        return (3, 0, original_index)
    if item.name in _BASE_COLUMN_ORDER:
        return (0, _BASE_COLUMN_ORDER[item.name], 0)
    if item.foreign_keys:
        return (1, 0, original_index)
    return (2, 0, original_index)


def _reorder_create_table_columns(op):
    items = list(op.columns)
    op.columns = [
        item
        for _, item in sorted(
            enumerate(items),
            key=lambda pair: _column_sort_key(pair[1], pair[0]),
        )
    ]


def _reorder_columns_in_ops(ops_container):
    for op in ops_container.ops:
        if isinstance(op, alembic_ops.ModifyTableOps):
            _reorder_columns_in_ops(op)
        elif isinstance(op, alembic_ops.CreateTableOp):
            _reorder_create_table_columns(op)


def generate_rev_id():
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M")
    return timestamp


def process_revision_directives(context, revision, directives):
    if directives:
        script = directives[0]
        if script.upgrade_ops is not None:
            _reorder_columns_in_ops(script.upgrade_ops)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        process_revision_directives=process_revision_directives,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            process_revision_directives=process_revision_directives,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
