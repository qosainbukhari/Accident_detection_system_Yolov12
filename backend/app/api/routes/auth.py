"""
routes/auth.py – /auth/register  /auth/login  /auth/me
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import crud
from app.core.security import verify_password, create_access_token
from app.schemas.auth import UserRegister, UserOut, Token
from app.api.deps import get_current_user

router = APIRouter()


# ── POST /auth/register ───────────────────────────────────────────
@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Returns 400 if username or email is already taken.
    Returns 422 if validation fails (short password, bad email, etc.)
    """
    # Duplicate username check
    if crud.get_user_by_username(db, payload.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken. Please choose another.",
        )

    # Duplicate email check
    if crud.get_user_by_email(db, str(payload.email)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please log in or use another email.",
        )

    # Create the user
    try:
        user = crud.create_user(
            db       = db,
            username = payload.username,
            email    = str(payload.email),
            password = payload.password,
            role     = "viewer",
        )
    except ValueError as e:
        # Raised by crud.create_user on DB IntegrityError
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create account.",
        )

    return user


# ── POST /auth/login ──────────────────────────────────────────────
@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login with username + password (form/urlencoded, not JSON).
    Returns a JWT Bearer token.

    401 → wrong credentials
    403 → account deactivated
    """
    user = crud.get_user_by_username(db, form.username)

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated. Contact an administrator.",
        )

    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


# ── GET /auth/me ──────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
def get_me(current_user=Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
