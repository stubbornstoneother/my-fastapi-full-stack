"""Organization management API routes."""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message
from app.models_system import (
    Organization,
    OrganizationCreate,
    OrganizationPublic,
    OrganizationsPublic,
    OrganizationTree,
    OrganizationUpdate,
)

router = APIRouter(prefix="/system/org", tags=["organizations"])


def build_tree(orgs: list[Organization], parent_id: uuid.UUID | None = None) -> list[OrganizationTree]:
    """Build a tree structure from flat organization list."""
    tree = []
    for org in orgs:
        if org.parent_id == parent_id:
            node = OrganizationTree(
                id=org.id,
                name=org.name,
                code=org.code,
                parent_id=org.parent_id,
                sort_order=org.sort_order,
                created_at=org.created_at,
                updated_at=org.updated_at,
                children=build_tree(orgs, org.id),
            )
            tree.append(node)
    tree.sort(key=lambda x: x.sort_order)
    return tree


@router.get("/", response_model=OrganizationsPublic)
def read_organizations(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 100,
) -> Any:
    """List all organizations."""
    count = session.exec(select(func.count()).select_from(Organization)).one()
    orgs = session.exec(
        select(Organization).order_by(Organization.sort_order).offset(skip).limit(limit)
    ).all()
    return OrganizationsPublic(data=orgs, count=count)


@router.get("/tree", response_model=list[OrganizationTree])
def read_organization_tree(
    session: SessionDep, current_user: CurrentUser,
) -> Any:
    """Get organization tree structure."""
    orgs = session.exec(select(Organization)).all()
    return build_tree(list(orgs))


@router.post("/", response_model=OrganizationPublic)
def create_organization(
    *, session: SessionDep, current_user: CurrentUser, org_in: OrganizationCreate,
) -> Any:
    """Create a new organization."""
    org = Organization.model_validate(org_in)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@router.put("/{org_id}", response_model=OrganizationPublic)
def update_organization(
    *, session: SessionDep, current_user: CurrentUser,
    org_id: uuid.UUID, org_in: OrganizationUpdate,
) -> Any:
    """Update an organization."""
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="组织不存在")

    update_data = org_in.model_dump(exclude_unset=True)
    org.sqlmodel_update(update_data)
    org.updated_at = datetime.now(timezone.utc)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@router.delete("/{org_id}")
def delete_organization(
    session: SessionDep, current_user: CurrentUser, org_id: uuid.UUID,
) -> Message:
    """Delete an organization."""
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="组织不存在")

    # Check if org has children
    children = session.exec(
        select(Organization).where(Organization.parent_id == org_id)
    ).first()
    if children:
        raise HTTPException(status_code=400, detail="请先删除下级组织")

    session.delete(org)
    session.commit()
    return Message(message="删除成功")
