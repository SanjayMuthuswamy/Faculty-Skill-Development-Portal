from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.base import CRUDBase
from app.models.program import Program, Enrollment
from app.schemas.program import ProgramCreate, ProgramUpdate, EnrollmentCreate
from app.models.enums import EnrollmentStatus

class CRUDProgram(CRUDBase[Program, ProgramCreate, ProgramUpdate]):
    async def create(self, db: AsyncSession, *, obj_in: ProgramCreate) -> Program:
        db_obj = Program(
            id=str(uuid.uuid4()),
            **obj_in.model_dump()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

program = CRUDProgram(Program)

class CRUDEnrollment(CRUDBase[Enrollment, EnrollmentCreate, EnrollmentCreate]): # Update schema same for now
    async def get_by_user_and_program(self, db: AsyncSession, *, user_id: str, program_id: str) -> Optional[Enrollment]:
        result = await db.execute(
            select(Enrollment).filter(Enrollment.user_id == user_id, Enrollment.program_id == program_id)
        )
        return result.scalars().first()
        
    async def get_by_user(self, db: AsyncSession, *, user_id: str) -> List[Enrollment]:
         result = await db.execute(select(Enrollment).filter(Enrollment.user_id == user_id))
         return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: EnrollmentCreate, user_id: str) -> Enrollment:
        db_obj = Enrollment(
            id=str(uuid.uuid4()),
            program_id=obj_in.program_id,
            user_id=user_id,
            status=EnrollmentStatus.ENROLLED
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

enrollment = CRUDEnrollment(Enrollment)
