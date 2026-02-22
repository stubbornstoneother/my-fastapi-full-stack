from fastapi import APIRouter

from app.api.routes import dicts, login, logs, organizations, persons, private, robots, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(robots.router)
api_router.include_router(persons.router)
api_router.include_router(dicts.router)
api_router.include_router(organizations.router)
api_router.include_router(logs.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
