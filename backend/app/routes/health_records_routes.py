from datetime import datetime

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.health_records_schemas import AnalyzeResponse, UploadResponse
from app.services.health_records_service import analyze_report_image, upload_file_to_cloudinary

router = APIRouter(prefix="/health-records", tags=["Health Records"])


@router.post("/upload", response_model=UploadResponse)
async def upload_health_record_file(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        if not file_bytes:
            return UploadResponse(
                success=False,
                error="Uploaded file is empty",
                timestamp=datetime.now().astimezone().isoformat(),
            )

        result = upload_file_to_cloudinary(
            file_bytes=file_bytes,
            filename=file.filename or "health-record",
            content_type=file.content_type or "application/octet-stream",
        )
        return UploadResponse(**result)
    except Exception as exc:
        return UploadResponse(
            success=False,
            error=str(exc),
            timestamp=datetime.now().astimezone().isoformat(),
        )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_health_record_image(
    image: UploadFile = File(...),
    custom_prompt: str = Form(""),
):
    try:
        content_type = image.content_type or "application/octet-stream"
        if not content_type.startswith("image/"):
            return AnalyzeResponse(
                success=False,
                error="Only image files are supported (JPG/PNG/WebP)",
                timestamp=datetime.now().astimezone().isoformat(),
            )

        file_bytes = await image.read()
        if not file_bytes:
            return AnalyzeResponse(
                success=False,
                error="Uploaded image is empty",
                timestamp=datetime.now().astimezone().isoformat(),
            )

        result = analyze_report_image(
            file_bytes=file_bytes,
            content_type=content_type,
            custom_prompt=custom_prompt,
        )
        return AnalyzeResponse(**result)
    except Exception as exc:
        return AnalyzeResponse(
            success=False,
            error=str(exc),
            timestamp=datetime.now().astimezone().isoformat(),
        )
