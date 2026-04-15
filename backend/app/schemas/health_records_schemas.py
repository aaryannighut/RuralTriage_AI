from typing import Optional

from pydantic import BaseModel


class AnalyzeResponse(BaseModel):
    success: bool
    explanation: Optional[str] = None
    model: Optional[str] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class UploadResponse(BaseModel):
    success: bool
    file_url: Optional[str] = None
    public_id: Optional[str] = None
    original_filename: Optional[str] = None
    resource_type: Optional[str] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None
