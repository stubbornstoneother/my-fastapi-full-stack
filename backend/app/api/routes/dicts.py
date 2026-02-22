"""Dictionary management API routes."""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message
from app.models_system import (
    DictItem,
    DictItemCreate,
    DictItemPublic,
    DictItemsPublic,
    DictItemUpdate,
    DictType,
    DictTypeCreate,
    DictTypePublic,
    DictTypesPublic,
    DictTypeUpdate,
    DictTypeWithItems,
)

router = APIRouter(prefix="/system/dict", tags=["dictionaries"])


# ===== DictType CRUD =====

@router.get("/types/", response_model=DictTypesPublic)
def read_dict_types(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 100,
) -> Any:
    """List all dictionary types."""
    count = session.exec(select(func.count()).select_from(DictType)).one()
    types = session.exec(
        select(DictType).order_by(col(DictType.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return DictTypesPublic(data=types, count=count)


@router.get("/types/{type_id}", response_model=DictTypeWithItems)
def read_dict_type_with_items(
    session: SessionDep, current_user: CurrentUser, type_id: uuid.UUID,
) -> Any:
    """Get a dictionary type with all its items."""
    dt = session.get(DictType, type_id)
    if not dt:
        raise HTTPException(status_code=404, detail="字典类型不存在")

    items = session.exec(
        select(DictItem)
        .where(DictItem.dict_type_id == type_id)
        .order_by(DictItem.sort_order)
    ).all()

    return DictTypeWithItems(
        id=dt.id,
        name=dt.name,
        code=dt.code,
        description=dt.description,
        created_at=dt.created_at,
        items=items,
    )


@router.get("/by-code/{code}", response_model=DictTypeWithItems)
def read_dict_type_by_code(
    session: SessionDep, code: str,
) -> Any:
    """Get a dictionary type by code with all its items (no auth required for robot)."""
    dt = session.exec(select(DictType).where(DictType.code == code)).first()
    if not dt:
        raise HTTPException(status_code=404, detail="字典类型不存在")

    items = session.exec(
        select(DictItem)
        .where(DictItem.dict_type_id == dt.id)
        .order_by(DictItem.sort_order)
    ).all()

    return DictTypeWithItems(
        id=dt.id,
        name=dt.name,
        code=dt.code,
        description=dt.description,
        created_at=dt.created_at,
        items=items,
    )


@router.post("/types/", response_model=DictTypePublic)
def create_dict_type(
    *, session: SessionDep, current_user: CurrentUser, dt_in: DictTypeCreate,
) -> Any:
    """Create a new dictionary type."""
    existing = session.exec(
        select(DictType).where(DictType.code == dt_in.code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="字典类型编码已存在")

    dt = DictType.model_validate(dt_in)
    session.add(dt)
    session.commit()
    session.refresh(dt)
    return dt


@router.put("/types/{type_id}", response_model=DictTypePublic)
def update_dict_type(
    *, session: SessionDep, current_user: CurrentUser,
    type_id: uuid.UUID, dt_in: DictTypeUpdate,
) -> Any:
    """Update a dictionary type."""
    dt = session.get(DictType, type_id)
    if not dt:
        raise HTTPException(status_code=404, detail="字典类型不存在")

    update_data = dt_in.model_dump(exclude_unset=True)
    dt.sqlmodel_update(update_data)
    session.add(dt)
    session.commit()
    session.refresh(dt)
    return dt


@router.delete("/types/{type_id}")
def delete_dict_type(
    session: SessionDep, current_user: CurrentUser, type_id: uuid.UUID,
) -> Message:
    """Delete a dictionary type and all its items."""
    dt = session.get(DictType, type_id)
    if not dt:
        raise HTTPException(status_code=404, detail="字典类型不存在")
    session.delete(dt)
    session.commit()
    return Message(message="删除成功")


# ===== DictItem CRUD =====

@router.get("/items/", response_model=DictItemsPublic)
def read_dict_items(
    session: SessionDep, current_user: CurrentUser,
    type_id: uuid.UUID | None = None,
    skip: int = 0, limit: int = 100,
) -> Any:
    """List dictionary items, optionally filtered by type."""
    query = select(DictItem)
    if type_id:
        query = query.where(DictItem.dict_type_id == type_id)

    count_stmt = select(func.count()).select_from(query.subquery())
    count = session.exec(count_stmt).one()

    items = session.exec(
        query.order_by(DictItem.sort_order).offset(skip).limit(limit)
    ).all()
    return DictItemsPublic(data=items, count=count)


@router.post("/items/", response_model=DictItemPublic)
def create_dict_item(
    *, session: SessionDep, current_user: CurrentUser, item_in: DictItemCreate,
) -> Any:
    """Create a new dictionary item."""
    item = DictItem.model_validate(item_in)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=DictItemPublic)
def update_dict_item(
    *, session: SessionDep, current_user: CurrentUser,
    item_id: uuid.UUID, item_in: DictItemUpdate,
) -> Any:
    """Update a dictionary item."""
    item = session.get(DictItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="字典项不存在")

    update_data = item_in.model_dump(exclude_unset=True)
    item.sqlmodel_update(update_data)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_dict_item(
    session: SessionDep, current_user: CurrentUser, item_id: uuid.UUID,
) -> Message:
    """Delete a dictionary item."""
    item = session.get(DictItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="字典项不存在")
    session.delete(item)
    session.commit()
    return Message(message="删除成功")
