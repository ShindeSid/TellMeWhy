from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ingestion.service import (
    IngestionError,
    delete_knowledge_item,
    extract_text_from_pdf,
    extract_text_from_url,
    ingest_text,
)
from app.models.schemas import KnowledgeListResponse, KnowledgeUploadRequest, KnowledgeUploadResponse
from app.trust_graph import graph_store

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("", response_model=KnowledgeListResponse)
async def list_knowledge() -> KnowledgeListResponse:
    items = await graph_store.list_knowledge_items()
    return KnowledgeListResponse(items=items)


@router.post("/upload-file", response_model=KnowledgeUploadResponse)
async def upload_file(file: UploadFile = File(...)) -> KnowledgeUploadResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    filename = file.filename or "uploaded file"
    try:
        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(data)
        else:
            text = data.decode("utf-8", errors="ignore")
    except IngestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        chunk_count = await ingest_text(filename, "file", filename, text)
    except IngestionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    items = await graph_store.list_knowledge_items()
    return KnowledgeUploadResponse(item=items[0], chunk_count=chunk_count)


@router.post("/upload-url", response_model=KnowledgeUploadResponse)
async def upload_url(url: str = Form(...)) -> KnowledgeUploadResponse:
    try:
        title, text = await extract_text_from_url(url)
        chunk_count = await ingest_text(title, "url", url, text)
    except IngestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    items = await graph_store.list_knowledge_items()
    return KnowledgeUploadResponse(item=items[0], chunk_count=chunk_count)


@router.delete("/{item_id}", status_code=204)
async def delete_knowledge(item_id: str) -> None:
    try:
        await delete_knowledge_item(item_id)
    except IngestionError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/upload-text", response_model=KnowledgeUploadResponse)
async def upload_text(payload: KnowledgeUploadRequest) -> KnowledgeUploadResponse:
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    title = payload.title or (payload.text.strip()[:60] + "...")
    try:
        chunk_count = await ingest_text(title, "text", None, payload.text)
    except IngestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    items = await graph_store.list_knowledge_items()
    return KnowledgeUploadResponse(item=items[0], chunk_count=chunk_count)
