import base64
import json
import mimetypes
import uuid
from datetime import datetime
from urllib import error, request

from app.settings import Settings

settings = Settings()

API_URL = "https://api.groq.com/openai/v1/chat/completions"


def _build_multipart_body(
    *,
    file_bytes: bytes,
    filename: str,
    content_type: str,
    upload_preset: str,
) -> tuple[bytes, str]:
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    crlf = "\r\n"

    parts: list[bytes] = []

    # upload_preset field
    parts.append(f"--{boundary}{crlf}".encode("utf-8"))
    parts.append(f'Content-Disposition: form-data; name="upload_preset"{crlf}{crlf}'.encode("utf-8"))
    parts.append(upload_preset.encode("utf-8"))
    parts.append(crlf.encode("utf-8"))

    # file field
    parts.append(f"--{boundary}{crlf}".encode("utf-8"))
    parts.append(
        (
            f'Content-Disposition: form-data; name="file"; filename="{filename}"{crlf}'
            f"Content-Type: {content_type}{crlf}{crlf}"
        ).encode("utf-8")
    )
    parts.append(file_bytes)
    parts.append(crlf.encode("utf-8"))

    parts.append(f"--{boundary}--{crlf}".encode("utf-8"))

    return b"".join(parts), boundary


def _build_prompt(extra_prompt: str = "") -> str:
    return f"""
You are a friendly medical assistant.

Task:
1. 🗣️ Answer in simple, natural English – conversational and easy to understand.

2. 👨‍⚕️ Human-friendly tone – Do not sound like a formal medical report. 
   Explain things like a knowledgeable and caring friend would.

3. 📊 Clearly explain each value:
   - Name of the parameter
   - Actual value
   - Normal range
   - If it is High or Low, explain what that usually means in simple terms

4. ✅ Acknowledge normal values as well – mention when something looks good or within the safe range.

5. ⚠️ Focus more on abnormal values, but avoid creating fear or panic.

6. 💊 Give general suggestions such as food habits or lifestyle improvements. 
   Do NOT recommend specific medicines.

7. 👩‍⚕️ Suggest consulting a doctor if something appears abnormal.

8. ❌ Do NOT give a medical diagnosis. Only explain what the values indicate.

Format:

Start with a friendly opening such as:
"Let's take a look at your report..."

Middle:
Explain each parameter clearly using simple bullet points or short paragraphs.

End:
Provide a short summary and gentle suggestions about possible next steps.

Tone Examples:

✅ "Your hemoglobin is slightly low (11.6), which is below the normal range of 13–17."

❌ "Hemoglobin level is 11.6 g/dL which indicates anemia."

✅ "Your platelet count is in a safe range, so there is nothing to worry about here."

❌ "Platelet count is within normal limits."
{extra_prompt}
""".strip()


def analyze_report_image(file_bytes: bytes, content_type: str, custom_prompt: str = "") -> dict:
    import httpx

    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in backend environment")

    model = settings.GROQ_VISION_MODEL or "llama-3.2-90b-vision-preview"
    image_b64 = base64.b64encode(file_bytes).decode("utf-8")
    image_url = f"data:{content_type};base64,{image_b64}"

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _build_prompt(custom_prompt)},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1500,
    }

    try:
        req = request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RuralTriageAI/1.0",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=90) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Groq HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Groq request failed: {exc.reason}") from exc

    explanation = (
        response_data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    if not explanation:
        raise RuntimeError("Model returned an empty explanation")

    return {
        "success": True,
        "explanation": explanation,
        "model": model,
        "timestamp": datetime.now().astimezone().isoformat(),
        "error": None,
    }


def upload_file_to_cloudinary(file_bytes: bytes, filename: str, content_type: str) -> dict:
    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    upload_preset = settings.CLOUDINARY_UPLOAD_PRESET

    if not cloud_name:
        raise RuntimeError("CLOUDINARY_CLOUD_NAME is not configured")

    # Prefer unsigned preset upload when configured.
    if upload_preset:
        endpoint = f"https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload"
        guessed_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        multipart_body, boundary = _build_multipart_body(
            file_bytes=file_bytes,
            filename=filename,
            content_type=guessed_type,
            upload_preset=upload_preset,
        )

        req = request.Request(endpoint, data=multipart_body, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

        try:
            with request.urlopen(req, timeout=90) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Cloudinary HTTP {exc.code}: {body}") from exc
        except error.URLError as exc:
            raise RuntimeError(f"Cloudinary request failed: {exc.reason}") from exc

        return {
            "success": True,
            "file_url": payload.get("secure_url"),
            "public_id": payload.get("public_id"),
            "original_filename": payload.get("original_filename") or filename,
            "resource_type": payload.get("resource_type"),
            "timestamp": datetime.now().astimezone().isoformat(),
            "error": None,
        }

    if api_key and api_secret:
        raise RuntimeError("Cloudinary signed upload is not yet configured. Please set CLOUDINARY_UPLOAD_PRESET")

    raise RuntimeError("Cloudinary credentials are not configured")
