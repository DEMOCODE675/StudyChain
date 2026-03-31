from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Note(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cid: str
    filename: str
    branch: str
    year: str
    semester: str
    subject: str
    chapter: str
    tags: list[str] = Field(default_factory=list)
    uploadedBy: str
    timestamp: datetime
    likes: int = 0


class NoteLikeRequest(BaseModel):
    cid: str
