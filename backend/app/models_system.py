"""
System models for the Robot Management Platform.
Includes: Organization, DictType, DictItem, Robot, RobotState,
RobotCommand, PersonInfo, SystemLog
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ========== Organization (组织架构) ==========

class OrganizationBase(SQLModel):
    name: str = Field(max_length=255, index=True)
    code: str | None = Field(default=None, max_length=100)
    parent_id: uuid.UUID | None = Field(default=None, foreign_key="organization.id")
    sort_order: int = Field(default=0)


class Organization(OrganizationBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    children: list["Organization"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    parent: Optional["Organization"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Organization.id"},
    )


class OrganizationCreate(SQLModel):
    name: str = Field(max_length=255)
    code: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int = 0


class OrganizationUpdate(SQLModel):
    name: str | None = None
    code: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int | None = None


class OrganizationPublic(OrganizationBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OrganizationTree(OrganizationPublic):
    children: list["OrganizationTree"] = []


class OrganizationsPublic(SQLModel):
    data: list[OrganizationPublic]
    count: int


# ========== DictType (数据字典类型) ==========

class DictTypeBase(SQLModel):
    name: str = Field(max_length=100, index=True)
    code: str = Field(max_length=100, unique=True, index=True)
    description: str | None = Field(default=None, max_length=500)


class DictType(DictTypeBase, table=True):
    __tablename__ = "dict_type"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    items: list["DictItem"] = Relationship(
        back_populates="dict_type",
        cascade_delete=True,
    )


class DictTypeCreate(SQLModel):
    name: str = Field(max_length=100)
    code: str = Field(max_length=100)
    description: str | None = None


class DictTypeUpdate(SQLModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None


class DictTypePublic(DictTypeBase):
    id: uuid.UUID
    created_at: datetime | None = None


class DictTypesPublic(SQLModel):
    data: list[DictTypePublic]
    count: int


# ========== DictItem (数据字典项) ==========

class DictItemBase(SQLModel):
    label: str = Field(max_length=100)
    value: str = Field(max_length=100)
    sort_order: int = Field(default=0)
    dict_type_id: uuid.UUID = Field(foreign_key="dict_type.id")


class DictItem(DictItemBase, table=True):
    __tablename__ = "dict_item"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    dict_type: DictType | None = Relationship(back_populates="items")


class DictItemCreate(SQLModel):
    label: str = Field(max_length=100)
    value: str = Field(max_length=100)
    sort_order: int = 0
    dict_type_id: uuid.UUID


class DictItemUpdate(SQLModel):
    label: str | None = None
    value: str | None = None
    sort_order: int | None = None


class DictItemPublic(DictItemBase):
    id: uuid.UUID
    created_at: datetime | None = None


class DictItemsPublic(SQLModel):
    data: list[DictItemPublic]
    count: int


class DictTypeWithItems(DictTypePublic):
    items: list[DictItemPublic] = []


# ========== Robot (机器人) ==========

class RobotBase(SQLModel):
    name: str = Field(max_length=255)
    code: str = Field(max_length=100, unique=True, index=True)
    ip: str | None = Field(default=None, max_length=100)


class Robot(RobotBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    # Latest heartbeat info (cached for quick query)
    last_heartbeat: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )
    robot_state: int = Field(default=0)  # 0: idle, 1: examining
    current_task: str | None = Field(default=None, max_length=255)
    latitude: str | None = Field(default=None, max_length=50)
    longitude: str | None = Field(default=None, max_length=50)
    # Command to send on next heartbeat
    pending_command: str | None = Field(default=None, sa_type=Text())
    # Track user info sync
    user_info_version: str | None = Field(default=None, max_length=50)
    needs_user_update: bool = Field(default=False)


class RobotCreate(SQLModel):
    name: str = Field(max_length=255)
    code: str = Field(max_length=100)
    ip: str | None = None


class RobotUpdate(SQLModel):
    name: str | None = None
    code: str | None = None
    ip: str | None = None


class RobotPublic(RobotBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_heartbeat: datetime | None = None
    robot_state: int = 0
    current_task: str | None = None
    latitude: str | None = None
    longitude: str | None = None
    is_online: bool = False


class RobotsPublic(SQLModel):
    data: list[RobotPublic]
    count: int


# ========== Robot Registration API Response (兼容原始接口) ==========

class RobotAddResponse(SQLModel):
    success: bool
    message: str
    code: int


# ========== Heartbeat Request/Response ==========

class HeartbeatRequest(SQLModel):
    robotCode: str
    robotState: int = 0
    task: str | None = None
    latitude: str | None = None
    longitude: str | None = None


class HeartbeatResponse(SQLModel):
    result: str = ""
    userInfoVersion: str = "0"


# ========== Robot Command ==========

class CommandRequest(SQLModel):
    command: str  # "update" | "begin_exam_xxx" | "begin_train_xxx" | "begin_test_xxx" | "end" | "update_user" | "update_user_all"
    robot_codes: list[str] = []


# ========== PersonInfo (人员信息) ==========

class PersonInfoBase(SQLModel):
    name: str = Field(max_length=100)
    gender: str = Field(max_length=10)
    age: int
    height: str | None = Field(default=None, max_length=20)
    weight: str | None = Field(default=None, max_length=20)
    card_id: str = Field(max_length=50, unique=True, index=True)
    soldier_id: str = Field(max_length=50)
    category_name: str = Field(max_length=50)
    category: str = Field(max_length=10)
    difficulty: str = Field(max_length=10)
    title: str | None = Field(default=None, max_length=100)
    disease: str | None = Field(default=None, max_length=10)
    bucankao: str | None = Field(default=None, max_length=255)
    bmi: str | None = Field(default=None, max_length=20)
    pbf: str | None = Field(default=None, max_length=20)
    sys_org_code: uuid.UUID | None = Field(default=None, foreign_key="organization.id")


class PersonInfo(PersonInfoBase, table=True):
    __tablename__ = "person_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    del_flag: str = Field(default="0", max_length=1)  # 0: normal, 1: deleted
    avatar_path: str | None = Field(default=None, max_length=500)


class PersonInfoCreate(SQLModel):
    name: str = Field(max_length=100)
    gender: str = Field(max_length=10)
    age: int
    height: str | None = None
    weight: str | None = None
    card_id: str = Field(max_length=50)
    soldier_id: str = Field(max_length=50)
    category_name: str = Field(max_length=50)
    category: str = Field(max_length=10)
    difficulty: str = Field(max_length=10)
    title: str | None = None
    disease: str | None = None
    bucankao: str | None = None
    bmi: str | None = None
    pbf: str | None = None
    sys_org_code: uuid.UUID | None = None


class PersonInfoUpdate(SQLModel):
    name: str | None = None
    gender: str | None = None
    age: int | None = None
    height: str | None = None
    weight: str | None = None
    card_id: str | None = None
    soldier_id: str | None = None
    category_name: str | None = None
    category: str | None = None
    difficulty: str | None = None
    title: str | None = None
    disease: str | None = None
    bucankao: str | None = None
    bmi: str | None = None
    pbf: str | None = None
    sys_org_code: uuid.UUID | None = None


class PersonInfoPublic(PersonInfoBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    del_flag: str = "0"
    avatar_path: str | None = None


class PersonsPublic(SQLModel):
    data: list[PersonInfoPublic]
    count: int


class BatchUpdateRequest(SQLModel):
    ids: list[uuid.UUID]
    category: str | None = None
    category_name: str | None = None
    difficulty: str | None = None
    age: int | None = None
    sys_org_code: uuid.UUID | None = None


# Robot download API (兼容原始接口)
class PersonRlistRequest(SQLModel):
    finalDate: str | None = None
    robotCode: str | None = None


class PersonRlistItem(SQLModel):
    id: str
    createBy: str | None = None
    createTime: str | None = None
    updateBy: str | None = None
    updateTime: str | None = None
    sysOrgCode: str | None = None
    name: str
    gender: str
    age: int
    height: str | None = None
    weight: str | None = None
    cardId: str
    soldierId: str
    categoryName: str
    difficulty: str
    title: str | None = None
    category: str
    disease: str | None = None
    bucankao: str | None = None
    bmi: str | None = None
    pbf: str | None = None
    delFlag: str = "0"


# ========== SystemLog (系统日志) ==========

class SystemLogBase(SQLModel):
    log_type: str = Field(max_length=50, index=True)  # "robot" | "system"
    level: str = Field(max_length=20, index=True)  # "error" | "warn" | "info"
    message: str = Field(sa_type=Text())
    source: str | None = Field(default=None, max_length=255)
    robot_code: str | None = Field(default=None, max_length=100)


class SystemLog(SystemLogBase, table=True):
    __tablename__ = "system_log"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )


class SystemLogCreate(SQLModel):
    log_type: str = Field(max_length=50)
    level: str = Field(max_length=20)
    message: str
    source: str | None = None
    robot_code: str | None = None


class SystemLogPublic(SystemLogBase):
    id: uuid.UUID
    created_at: datetime | None = None


class SystemLogsPublic(SQLModel):
    data: list[SystemLogPublic]
    count: int
