"""System log viewing API routes."""
import uuid
from typing import Any

from fastapi import APIRouter
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models_system import (
    SystemLog,
    SystemLogPublic,
    SystemLogsPublic,
)

router = APIRouter(prefix="/system/logs", tags=["logs"])


@router.get("/", response_model=SystemLogsPublic)
def read_logs(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 50,
    log_type: str | None = None,
    level: str | None = None,
    robot_code: str | None = None,
) -> Any:
    """List system logs with filtering."""
    query = select(SystemLog)
    if log_type:
        query = query.where(SystemLog.log_type == log_type)
    if level:
        query = query.where(SystemLog.level == level)
    if robot_code:
        query = query.where(SystemLog.robot_code == robot_code)

    count_stmt = select(func.count()).select_from(query.subquery())
    count = session.exec(count_stmt).one()

    logs = session.exec(
        query.order_by(col(SystemLog.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return SystemLogsPublic(data=logs, count=count)
