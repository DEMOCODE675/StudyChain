import asyncio
import io
import os

import requests
from fastapi import UploadFile

PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"


class IPFSUploadError(Exception):
    """Raised when upload to IPFS through Pinata fails."""


async def upload_file_to_ipfs(file: UploadFile) -> str:
    jwt = os.getenv("PINATA_JWT")
    api_key = os.getenv("PINATA_API_KEY")
    api_secret = os.getenv("PINATA_SECRET_API_KEY")

    if not jwt and (not api_key or not api_secret):
        raise IPFSUploadError(
            "Pinata credentials are missing. Set PINATA_JWT or both PINATA_API_KEY and PINATA_SECRET_API_KEY."
        )

    content = await file.read()
    if not content:
        raise IPFSUploadError("Cannot upload an empty file.")

    # requests is blocking, so run the network call in a worker thread.
    return await asyncio.to_thread(
        _pin_file,
        filename=file.filename or "note.txt",
        content_type=file.content_type,
        content=content,
        jwt=jwt,
        api_key=api_key,
        api_secret=api_secret,
    )


def _pin_file(
    filename: str,
    content_type: str | None,
    content: bytes,
    jwt: str | None,
    api_key: str | None,
    api_secret: str | None,
) -> str:
    if jwt:
        headers = {"Authorization": f"Bearer {jwt}"}
    else:
        headers = {
            "pinata_api_key": api_key,
            "pinata_secret_api_key": api_secret,
        }

    files = {
        "file": (filename, io.BytesIO(content), content_type or "application/octet-stream")
    }

    try:
        response = requests.post(
            PINATA_UPLOAD_URL,
            headers=headers,
            files=files,
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        detail = ""
        if exc.response is not None:
            detail = exc.response.text.strip()
        message = "Pinata upload failed."
        if detail:
            message = f"{message} {detail}"
        raise IPFSUploadError(message) from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise IPFSUploadError("Pinata returned a non-JSON response.") from exc

    cid = payload.get("IpfsHash")
    if not cid:
        raise IPFSUploadError("Pinata response did not include an IPFS CID.")

    return cid
