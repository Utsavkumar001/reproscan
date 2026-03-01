from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.extractor import extract_sections
from services.analyzer import analyze_paper as run_analysis, generate_summary
from services.scorer import calculate_risk_score, build_red_flags
from services.recommender import get_recommendations
from services.novelty import analyze_novelty
from services.history import save_result, get_all_history, get_result_by_id, delete_history_item  # ← NEW
from groq import Groq
import os

router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
paper_store = {}  # Paper text yahan store hoga chat ke liye


@router.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file.")
    try:
        sections = extract_sections(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {str(e)}")

    # Chat ke liye paper text store karo
    paper_store["current"] = "\n".join(sections.values())[:8000]
    paper_store["filename"] = file.filename

    try:
        analyses = run_analysis(sections)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    score_report    = calculate_risk_score(analyses)
    red_flags       = build_red_flags(analyses)
    recommendations = get_recommendations(sections, analyses)

    result = {
        "filename": file.filename,
        "score": score_report,
        "red_flags": red_flags,
        "detailed_analysis": analyses,
        "recommendations": recommendations,
        "sections_found": [k for k, v in sections.items() if v.strip()],
    }

    # ← History mein save karo
    save_result(file.filename, score_report["total_score"], result)

    return result


@router.post("/summarize")
async def summarize_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file.")
    try:
        sections = extract_sections(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {str(e)}")

    paper_store["current"] = "\n".join(sections.values())[:8000]
    paper_store["filename"] = file.filename

    try:
        summary = generate_summary(sections)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")
    return {"filename": file.filename, "summary": summary}


@router.post("/novelty")
async def novelty_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read uploaded file.")
    try:
        sections = extract_sections(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {str(e)}")

    paper_store["current"] = "\n".join(sections.values())[:8000]
    paper_store["filename"] = file.filename

    try:
        novelty = analyze_novelty(sections)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Novelty analysis failed: {str(e)}")
    return {"filename": file.filename, "novelty": novelty}


# ─── HISTORY ENDPOINTS ────────────────────────────────────────────────────────

@router.get("/history")
async def get_history():
    """Saari past audits ki list"""
    return get_all_history()

@router.get("/history/{history_id}")
async def get_history_detail(history_id: int):
    """Ek specific audit ka full result"""
    item = get_result_by_id(history_id)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found.")
    return item

@router.delete("/history/{history_id}")
async def delete_history(history_id: int):
    """Ek entry delete karo"""
    delete_history_item(history_id)
    return {"deleted": True}


# ─── CHAT ENDPOINT ────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    history: list = []


@router.post("/chat")
async def chat_with_paper(req: ChatRequest):
    paper_text = paper_store.get("current", "")

    if not paper_text:
        raise HTTPException(status_code=400, detail="No paper uploaded yet. Please analyze a paper first.")

    system_prompt = f"""You are an expert AI research assistant.
A research paper has been uploaded. Answer questions about it clearly and concisely.
Be specific — reference actual content from the paper when possible.
If the answer is not in the paper, say so honestly.

--- PAPER CONTENT ---
{paper_text}
--- END OF PAPER ---
"""
    messages = [{"role": "system", "content": system_prompt}]

    for msg in req.history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": req.question})

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.4,
            max_tokens=600,
        )
        return {"answer": response.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")