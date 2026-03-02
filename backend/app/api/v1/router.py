"""
Aggregated API v1 router — includes all endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import computers, employees, licenses, assignments, dashboard, license_assignments, kiosks, printers, categories, processes

router = APIRouter(prefix="/api/v1")

router.include_router(computers.router)
router.include_router(employees.router)
router.include_router(licenses.router)
router.include_router(assignments.router)
router.include_router(dashboard.router)
router.include_router(license_assignments.router)
router.include_router(kiosks.router)
router.include_router(printers.router)
router.include_router(categories.router)
router.include_router(processes.router)
