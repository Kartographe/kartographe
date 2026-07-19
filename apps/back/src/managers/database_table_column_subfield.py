# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Sub-field lifecycle: nested creation, grouped listing, cascading delete.

A sub-field belongs to a JSON column and may nest under another sub-field of the
same column (`parent_subfield_id`). Sub-fields are created inline with their
column (`create_flat`, from a flat list nested by `parent_index`) or one node at
a time through the dedicated routes.
"""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlmodel import col, select

from src.managers._base import BaseEntityManager
from src.models.database_column_type import DatabaseColumnType
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_table_column_subfield import DatabaseTableColumnSubfield
from src.utils.datetime import utc_now

# Bound on how deep a JSON sub-field tree may nest, to stop pathological input.
_MAX_SUBFIELD_DEPTH = 8


class DatabaseTableColumnSubfieldManager(BaseEntityManager):
    def list_for_column(self, column: DatabaseTableColumn) -> list[DatabaseTableColumnSubfield]:
        """Every enabled sub-field of the column, ordered by rank then insertion."""
        return list(
            self.session.exec(
                select(DatabaseTableColumnSubfield)
                .where(
                    DatabaseTableColumnSubfield.database_table_column_id == column.id,
                    DatabaseTableColumnSubfield.enabled.is_(True),
                )
                .order_by(
                    DatabaseTableColumnSubfield.rank.asc(),
                    DatabaseTableColumnSubfield.created_at.asc(),
                )
            ).all()
        )

    def group_by_column(
        self, column_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, list[DatabaseTableColumnSubfield]]:
        """Enabled sub-fields of several columns at once, keyed by column id."""
        grouped: dict[uuid.UUID, list[DatabaseTableColumnSubfield]] = defaultdict(list)
        if not column_ids:
            return grouped
        rows = self.session.exec(
            select(DatabaseTableColumnSubfield)
            .where(
                col(DatabaseTableColumnSubfield.database_table_column_id).in_(column_ids),
                DatabaseTableColumnSubfield.enabled.is_(True),
            )
            .order_by(
                DatabaseTableColumnSubfield.rank.asc(),
                DatabaseTableColumnSubfield.created_at.asc(),
            )
        ).all()
        for subfield in rows:
            grouped[subfield.database_table_column_id].append(subfield)
        return grouped

    def _validate_type(self, database_column_type_id: uuid.UUID) -> None:
        column_type = self.session.get(DatabaseColumnType, database_column_type_id)
        if column_type is None or not column_type.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Column type not found.")

    def _validate_parent(
        self,
        column: DatabaseTableColumn,
        parent_subfield_id: uuid.UUID,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        parent = self.session.get(DatabaseTableColumnSubfield, parent_subfield_id)
        if parent is None or not parent.enabled or parent.database_table_column_id != column.id:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Parent sub-field not found in this column."
            )
        # On update, refuse to nest a sub-field under itself or its own descendant.
        if exclude_id is not None:
            cursor: DatabaseTableColumnSubfield | None = parent
            seen: set[uuid.UUID] = set()
            while cursor is not None:
                if cursor.id == exclude_id:
                    raise HTTPException(
                        status.HTTP_422_UNPROCESSABLE_CONTENT,
                        "A sub-field cannot be nested under itself.",
                    )
                if cursor.id in seen or cursor.parent_subfield_id is None:
                    break
                seen.add(cursor.id)
                cursor = self.session.get(
                    DatabaseTableColumnSubfield, cursor.parent_subfield_id
                )

    def create(
        self,
        column: DatabaseTableColumn,
        *,
        database_column_type_id: uuid.UUID,
        parent_subfield_id: uuid.UUID | None,
        name: str,
        nullable: bool,
        rank: int,
        description: dict | None,
        commit: bool = True,
        validate_parent: bool = True,
    ) -> DatabaseTableColumnSubfield:
        """Create one sub-field on `column` after validating its references.

        `validate_parent=False` skips the parent check when the caller just
        created that parent itself (inline tree creation). `commit=False` lets a
        caller batch several sub-fields and commit once.
        """
        self._validate_type(database_column_type_id)
        if validate_parent and parent_subfield_id is not None:
            self._validate_parent(column, parent_subfield_id)
        subfield = DatabaseTableColumnSubfield(
            account_id=column.account_id,
            database_table_column_id=column.id,
            parent_subfield_id=parent_subfield_id,
            database_column_type_id=database_column_type_id,
            name=name,
            nullable=nullable,
            rank=rank,
            description=description,
        )
        self.session.add(subfield)
        if commit:
            self.session.commit()
            self.session.refresh(subfield)
        return subfield

    def create_flat(
        self, column: DatabaseTableColumn, inline_forms, *, commit: bool = False
    ) -> None:
        """Create sub-fields from a flat list, nesting them by `parent_index`.

        Each form's `parent_index` points at an earlier form in the same list
        (or is `None` for a top-level sub-field). The UUIDv7 id is assigned at
        construction, so a child can reference the parent id we just built.
        """
        created_ids: list[uuid.UUID] = []
        depths: list[int] = []
        for index, form in enumerate(inline_forms):
            parent_id: uuid.UUID | None = None
            depth = 0
            if form.parent_index is not None:
                if form.parent_index >= index:
                    raise HTTPException(
                        status.HTTP_422_UNPROCESSABLE_CONTENT,
                        "A sub-field's parentIndex must point to an earlier sub-field.",
                    )
                parent_id = created_ids[form.parent_index]
                depth = depths[form.parent_index] + 1
                if depth >= _MAX_SUBFIELD_DEPTH:
                    raise HTTPException(
                        status.HTTP_422_UNPROCESSABLE_CONTENT, "Sub-field nesting is too deep."
                    )
            subfield = self.create(
                column,
                database_column_type_id=form.database_column_type_id,
                parent_subfield_id=parent_id,
                name=form.name,
                nullable=form.nullable,
                rank=form.rank,
                description=form.description,
                commit=False,
                validate_parent=False,
            )
            created_ids.append(subfield.id)
            depths.append(depth)
        if commit:
            self.session.commit()

    def replace_for_column(
        self, column: DatabaseTableColumn, inline_forms, *, commit: bool = True
    ) -> None:
        """Disable the column's current sub-fields and rebuild them from a list."""
        self._bulk_disable(
            DatabaseTableColumnSubfield,
            DatabaseTableColumnSubfield.database_table_column_id == column.id,
            now=utc_now(),
        )
        self.create_flat(column, inline_forms, commit=False)
        if commit:
            self.session.commit()

    def update(
        self, column: DatabaseTableColumn, subfield: DatabaseTableColumnSubfield, fields: dict
    ) -> DatabaseTableColumnSubfield:
        """Apply a partial update, re-validating references when they change."""
        if "database_column_type_id" in fields:
            self._validate_type(fields["database_column_type_id"])
        if "parent_subfield_id" in fields and fields["parent_subfield_id"] is not None:
            self._validate_parent(column, fields["parent_subfield_id"], exclude_id=subfield.id)
        return self.apply_update(subfield, fields)

    def soft_delete(self, subfield: DatabaseTableColumnSubfield) -> None:
        """Soft-delete a sub-field and every sub-field nested under it."""
        now = utc_now()
        self._disable(subfield, now)
        self._disable_descendants(subfield, now)
        self.session.commit()

    def _disable_descendants(
        self, subfield: DatabaseTableColumnSubfield, now
    ) -> None:
        children = self.session.exec(
            select(DatabaseTableColumnSubfield).where(
                DatabaseTableColumnSubfield.parent_subfield_id == subfield.id,
                DatabaseTableColumnSubfield.enabled.is_(True),
            )
        ).all()
        for child in children:
            self._disable(child, now)
            self._disable_descendants(child, now)
