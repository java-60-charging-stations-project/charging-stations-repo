from typing import TypedDict, Optional, Literal

class get_user_info_payload(TypedDict):
    action: Literal["get_user_by_id", "get_all_users"]
    caller_id: str
    user_id: Optional[str]

class modify_user_group_payload(TypedDict):
    action: Literal["move_user_to_group"]
    caller_id: str
    user_id: str
    role: Literal["ADMIN", "TECH_SUPPORT", "USER"]
    user_pool_id: str