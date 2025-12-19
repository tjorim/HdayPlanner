# Placeholder for Azure AD JWT validation / MSAL integration.
# For development, we'll accept a header X-User to identify who is editing.

from fastapi import Header

async def get_current_user(x_user: str = Header(default='devuser')):
    return x_user or 'devuser'
