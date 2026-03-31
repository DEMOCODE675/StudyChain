from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from data.structure import get_academic_structure, is_valid_structure_path
from models.note import Note, NoteLikeRequest
from services.ipfs import IPFSUploadError, upload_file_to_ipfs

router = APIRouter(tags=["notes"])

# Temporary in-memory store. This resets when the backend process restarts.
_NOTES: list[Note] = []
_ALLOWED_EXTENSIONS = {".pdf", ".txt"}
_DEFAULT_UPLOADER = "0x0000000000000000000000000000000000000000"


def _is_allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in _ALLOWED_EXTENSIONS


def _normalize_tag(tag: str) -> str:
    collapsed = tag.strip().replace(" ", "")
    if not collapsed:
        return ""
    if not collapsed.startswith("#"):
        return f"#{collapsed}"
    return collapsed


def _parse_tags(raw_tags: str | None) -> list[str]:
    if not raw_tags:
        return []

    seen: set[str] = set()
    normalized_tags: list[str] = []

    for raw_tag in raw_tags.split(","):
        normalized = _normalize_tag(raw_tag)
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized_tags.append(normalized)

    return normalized_tags


def _sort_latest(notes: list[Note]) -> list[Note]:
    return sorted(notes, key=lambda note: note.timestamp, reverse=True)


def _sort_popular(notes: list[Note]) -> list[Note]:
    return sorted(notes, key=lambda note: (note.likes, note.timestamp), reverse=True)


def _matches_filter(
    note: Note,
    branch: str | None,
    year: str | None,
    semester: str | None,
    subject: str | None,
    chapter: str | None,
) -> bool:
    if branch and note.branch != branch:
        return False
    if year and note.year != year:
        return False
    if semester and note.semester != semester:
        return False
    if subject and note.subject != subject:
        return False
    if chapter and note.chapter.lower() != chapter.lower():
        return False
    return True


@router.get("/structure")
async def get_structure() -> dict[str, dict[str, dict[str, list[str]]]]:
    return get_academic_structure()


@router.post("/upload", response_model=Note, status_code=status.HTTP_201_CREATED)
async def upload_note(
    file: UploadFile = File(...),
    branch: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    subject: str = Form(...),
    chapter: str = Form(...),
    tags: str | None = Form(default=None),
    uploadedBy: str | None = Form(default=None),
) -> Note:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    if not _is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    clean_branch = branch.strip()
    clean_year = year.strip()
    clean_semester = semester.strip()
    clean_subject = subject.strip()
    clean_chapter = chapter.strip()

    if not all([clean_branch, clean_year, clean_semester, clean_subject, clean_chapter]):
        raise HTTPException(status_code=400, detail="All metadata fields are required.")

    if not is_valid_structure_path(clean_branch, clean_year, clean_semester, clean_subject):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid academic path. Please choose branch, year, semester, and subject "
                "from the predefined structure."
            ),
        )

    try:
        cid = await upload_file_to_ipfs(file)
    except IPFSUploadError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        await file.close()

    note = Note(
        cid=cid,
        filename=file.filename,
        branch=clean_branch,
        year=clean_year,
        semester=clean_semester,
        subject=clean_subject,
        chapter=clean_chapter,
        tags=_parse_tags(tags),
        uploadedBy=(uploadedBy or _DEFAULT_UPLOADER).strip() or _DEFAULT_UPLOADER,
        timestamp=datetime.now(timezone.utc),
        likes=0,
    )
    _NOTES.append(note)
    return note


@router.get("/notes", response_model=list[Note])
async def list_notes() -> list[Note]:
    return _sort_latest(_NOTES)


@router.get("/notes/filter", response_model=list[Note])
async def filter_notes(
    branch: str | None = Query(default=None),
    year: str | None = Query(default=None),
    semester: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    chapter: str | None = Query(default=None),
) -> list[Note]:
    clean_branch = branch.strip() if branch else None
    clean_year = year.strip() if year else None
    clean_semester = semester.strip() if semester else None
    clean_subject = subject.strip() if subject else None
    clean_chapter = chapter.strip() if chapter else None

    filtered = [
        note
        for note in _NOTES
        if _matches_filter(
            note,
            branch=clean_branch,
            year=clean_year,
            semester=clean_semester,
            subject=clean_subject,
            chapter=clean_chapter,
        )
    ]
    return _sort_latest(filtered)


@router.get("/notes/search", response_model=list[Note])
async def search_notes(keyword: str = Query(..., min_length=1)) -> list[Note]:
    term = keyword.strip().lower()
    if not term:
        return _sort_latest(_NOTES)

    matching_notes = []
    for note in _NOTES:
        haystack = [note.filename, note.subject, note.chapter, *note.tags]
        if any(term in field.lower() for field in haystack):
            matching_notes.append(note)

    return _sort_latest(matching_notes)


@router.post("/notes/like", response_model=Note)
async def like_note(request: NoteLikeRequest) -> Note:
    for index, note in enumerate(_NOTES):
        if note.cid != request.cid:
            continue

        updated_note = note.model_copy(update={"likes": note.likes + 1})
        _NOTES[index] = updated_note
        return updated_note

    raise HTTPException(status_code=404, detail="Note not found.")


@router.get("/notes/popular", response_model=list[Note])
async def popular_notes() -> list[Note]:
    return _sort_popular(_NOTES)