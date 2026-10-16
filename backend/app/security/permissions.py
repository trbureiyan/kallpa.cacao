from fastapi import Depends, HTTPException, status
from app.models import User
from app.security.authentication import current_user


def require_roles(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para esta acción")
        return user
    return dependency


operator_or_admin = require_roles("operator", "admin")
admin_only = require_roles("admin")
