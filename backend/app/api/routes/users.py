"""
routes/users.py – /users (admin only)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import crud
from app.schemas.auth import UserOut, UserUpdate
from app.api.deps import require_admin

router = APIRouter()


@router.get("", response_model=list[UserOut])
def list_users(
    skip:  int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Admin only – list all registered users."""
    return crud.get_all_users(db, skip=skip, limit=limit)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Admin only – update user role or active status."""
    data = payload.model_dump(exclude_none=True)
    user = crud.update_user(db, user_id, data)
    if not user:
        raise HTTPException(404, f"User #{user_id} not found")
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Admin only – deactivate a user account."""
    data = {"is_active": False}
    user = crud.update_user(db, user_id, data)
    if not user:
        raise HTTPException(404, f"User #{user_id} not found")
