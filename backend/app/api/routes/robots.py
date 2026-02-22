"""Robot management API routes."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Message
from app.models_system import (
    CommandRequest,
    HeartbeatRequest,
    HeartbeatResponse,
    Robot,
    RobotAddResponse,
    RobotCreate,
    RobotPublic,
    RobotUpdate,
    RobotsPublic,
    SystemLog,
    SystemLogCreate,
)

router = APIRouter(prefix="/system", tags=["robots"])

HEARTBEAT_TIMEOUT_MINUTES = 5


def robot_to_public(robot: Robot) -> RobotPublic:
    """Convert a Robot to RobotPublic with online status."""
    now = datetime.now(timezone.utc)
    is_online = False
    if robot.last_heartbeat:
        is_online = (now - robot.last_heartbeat) < timedelta(minutes=HEARTBEAT_TIMEOUT_MINUTES)

    return RobotPublic(
        id=robot.id,
        name=robot.name,
        code=robot.code,
        ip=robot.ip,
        created_at=robot.created_at,
        updated_at=robot.updated_at,
        last_heartbeat=robot.last_heartbeat,
        robot_state=robot.robot_state,
        current_task=robot.current_task,
        latitude=robot.latitude,
        longitude=robot.longitude,
        is_online=is_online,
    )


# ===== Robot Registration (兼容原始接口) =====

@router.post("/robotData/add", response_model=RobotAddResponse, tags=["robots"])
def add_robot_device(
    *, session: SessionDep, robot_in: RobotCreate
) -> Any:
    """Register a robot device (compatible with original API format)."""
    existing = session.exec(
        select(Robot).where(Robot.code == robot_in.code)
    ).first()
    if existing:
        return RobotAddResponse(success=False, message="机器人编号已经存在！", code=500)

    robot = Robot.model_validate(robot_in)
    session.add(robot)
    session.commit()

    # Log the registration
    log = SystemLog(
        log_type="robot",
        level="info",
        message=f"机器人 {robot_in.name}({robot_in.code}) 注册成功",
        robot_code=robot_in.code,
    )
    session.add(log)
    session.commit()

    return RobotAddResponse(success=True, message="操作成功！", code=200)


# ===== Heartbeat Monitoring =====

@router.post("/robotState/add", response_model=HeartbeatResponse, tags=["robots"])
def robot_heartbeat(
    *, session: SessionDep, heartbeat: HeartbeatRequest
) -> Any:
    """Robot heartbeat monitoring endpoint."""
    robot = session.exec(
        select(Robot).where(Robot.code == heartbeat.robotCode)
    ).first()
    if not robot:
        return HeartbeatResponse(result="", userInfoVersion="0")

    # Update robot state
    robot.last_heartbeat = datetime.now(timezone.utc)
    robot.robot_state = heartbeat.robotState
    robot.current_task = heartbeat.task
    robot.latitude = heartbeat.latitude
    robot.longitude = heartbeat.longitude
    session.add(robot)
    session.commit()
    session.refresh(robot)

    # Check if there's a pending command
    result = ""
    if robot.pending_command:
        result = robot.pending_command
        robot.pending_command = None
        session.add(robot)
        session.commit()

    return HeartbeatResponse(
        result=result,
        userInfoVersion=robot.user_info_version or "0",
    )


# ===== CRUD Endpoints (管理页面) =====

@router.get("/robots/", response_model=RobotsPublic, tags=["robots"])
def read_robots(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 100, search: str | None = None,
) -> Any:
    """List all robots with status."""
    query = select(Robot)
    if search:
        query = query.where(
            (Robot.name.contains(search)) | (Robot.code.contains(search))  # type: ignore
        )
    count_stmt = select(func.count()).select_from(query.subquery())
    count = session.exec(count_stmt).one()

    robots = session.exec(
        query.order_by(col(Robot.created_at).desc()).offset(skip).limit(limit)
    ).all()

    return RobotsPublic(
        data=[robot_to_public(r) for r in robots],
        count=count,
    )


@router.post("/robots/", response_model=RobotPublic, tags=["robots"])
def create_robot(
    *, session: SessionDep, current_user: CurrentUser, robot_in: RobotCreate
) -> Any:
    """Create a new robot."""
    existing = session.exec(
        select(Robot).where(Robot.code == robot_in.code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="机器人编号已经存在")

    robot = Robot.model_validate(robot_in)
    session.add(robot)
    session.commit()
    session.refresh(robot)
    return robot_to_public(robot)


@router.put("/robots/{robot_id}", response_model=RobotPublic, tags=["robots"])
def update_robot(
    *, session: SessionDep, current_user: CurrentUser,
    robot_id: uuid.UUID, robot_in: RobotUpdate,
) -> Any:
    """Update a robot."""
    robot = session.get(Robot, robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="机器人不存在")

    update_data = robot_in.model_dump(exclude_unset=True)
    # Check code uniqueness if code is being updated
    if "code" in update_data and update_data["code"] != robot.code:
        existing = session.exec(
            select(Robot).where(Robot.code == update_data["code"])
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="机器人编号已经存在")

    robot.sqlmodel_update(update_data)
    robot.updated_at = datetime.now(timezone.utc)
    session.add(robot)
    session.commit()
    session.refresh(robot)
    return robot_to_public(robot)


@router.delete("/robots/{robot_id}", tags=["robots"])
def delete_robot(
    session: SessionDep, current_user: CurrentUser, robot_id: uuid.UUID,
) -> Message:
    """Delete a robot."""
    robot = session.get(Robot, robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="机器人不存在")
    session.delete(robot)
    session.commit()
    return Message(message="删除成功")


@router.post("/robots/batch-delete", tags=["robots"])
def batch_delete_robots(
    *, session: SessionDep, current_user: CurrentUser, ids: list[uuid.UUID],
) -> Message:
    """Batch delete robots."""
    for rid in ids:
        robot = session.get(Robot, rid)
        if robot:
            session.delete(robot)
    session.commit()
    return Message(message="批量删除成功")


# ===== Command Dispatch =====

@router.post("/robots/{code}/command", tags=["robots"])
def send_command_to_robot(
    *, session: SessionDep, current_user: CurrentUser,
    code: str, command: CommandRequest,
) -> Message:
    """Send a command to a specific robot."""
    robot = session.exec(
        select(Robot).where(Robot.code == code)
    ).first()
    if not robot:
        raise HTTPException(status_code=404, detail="机器人不存在")

    robot.pending_command = command.command
    session.add(robot)
    session.commit()

    # Log the command
    log = SystemLog(
        log_type="robot",
        level="info",
        message=f"向机器人 {robot.name}({code}) 下发指令: {command.command}",
        robot_code=code,
    )
    session.add(log)
    session.commit()

    return Message(message="指令已下发")


@router.post("/robots/batch-command", tags=["robots"])
def send_batch_command(
    *, session: SessionDep, current_user: CurrentUser, command: CommandRequest,
) -> Message:
    """Send a command to multiple robots."""
    updated = 0
    for code in command.robot_codes:
        robot = session.exec(
            select(Robot).where(Robot.code == code)
        ).first()
        if robot:
            robot.pending_command = command.command
            session.add(robot)
            updated += 1

    session.commit()

    # Log the command
    log = SystemLog(
        log_type="robot",
        level="info",
        message=f"批量下发指令 {command.command} 到 {updated} 台机器人",
    )
    session.add(log)
    session.commit()

    return Message(message=f"指令已下发到 {updated} 台机器人")
