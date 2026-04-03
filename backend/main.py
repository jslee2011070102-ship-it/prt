"""
FastAPI 메인 애플리케이션
- API 라우터 (5개 엔드포인트)
- React 정적 파일 서빙
- SSE 스트리밍
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from anthropic import Anthropic

# 모듈 임포트
import image_parser
import analyzer
import docx_generator
from models import (
    Product,
    Competitor,
    SessionMeta,
    MarketAnalysisRequest,
    CompetitorAnalysisRequest,
    ReportRequest,
)

# 환경 변수 로드
load_dotenv(override=True)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")

# Anthropic 클라이언트 초기화
client = Anthropic(api_key=ANTHROPIC_API_KEY)

# FastAPI 앱 생성
app = FastAPI(title="Product Research Tool")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "localhost:3000",
        "localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === API 엔드포인트 ===

@app.get("/health")
def health_check():
    """헬스 체크"""
    return {"status": "ok"}


@app.post("/api/parse/category-images")
async def parse_category_images(files: list[UploadFile] = File(...)):
    """
    카테고리 이미지 파싱
    POST /api/parse/category-images

    multipart/form-data로 이미지 파일들을 전송
    응답: {"products": Product[]}
    """
    try:
        products = await image_parser.parse_category_images(files, client)
        return {"products": [p.model_dump() for p in products]}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/parse/competitor-images")
async def parse_competitor_images(
    competitor_name: str = Form(...),
    files: list[UploadFile] = File(...)
):
    """
    경쟁사 이미지 파싱
    POST /api/parse/competitor-images

    Body:
    - competitor_name: 경쟁사 브랜드명 (form)
    - files: 이미지 파일 배열 (multipart)

    응답: {"competitor": Competitor}
    """
    try:
        competitor = await image_parser.parse_competitor_images(competitor_name, files, client)
        return {"competitor": competitor.model_dump()}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/analyze/market")
async def analyze_market(request: MarketAnalysisRequest):
    """
    시장 분석 (SSE 스트리밍)
    POST /api/analyze/market

    Body:
    {
      "products": Product[],
      "brand_name": "브랜드명",
      "category_name": "카테고리명"
    }

    응답: text/event-stream (SSE)
    """
    def generate():
        try:
            for chunk in analyzer.analyze_market(
                request.products,
                request.brand_name,
                request.category_name,
                client
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [END]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/analyze/competitor")
async def analyze_competitor(request: CompetitorAnalysisRequest):
    """
    경쟁사 분석 (SSE 스트리밍)
    POST /api/analyze/competitor

    Body:
    {
      "competitors": Competitor[],
      "market_summary": "Step 2 분석 결과",
      "brand_name": "브랜드명"
    }

    응답: text/event-stream (SSE)
    """
    def generate():
        try:
            for chunk in analyzer.analyze_competitor(
                request.competitors,
                request.market_summary,
                request.brand_name,
                client
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [END]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/report/generate")
async def generate_report(request: ReportRequest):
    """
    기획서 생성 (SSE 스트리밍)
    POST /api/report/generate

    Body: ReportRequest
    {
      "meta": SessionMeta,
      "products": Product[],
      "market_analysis": str,
      "competitors": Competitor[],
      "competitor_analysis": str
    }

    응답: text/event-stream (SSE)
    """
    def generate():
        try:
            for chunk in docx_generator.create_docx_report(
                request.meta,
                request.products,
                request.market_analysis,
                request.competitors,
                request.competitor_analysis
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [END]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/report/download")
async def download_report(request: ReportRequest):
    """
    기획서 다운로드
    POST /api/report/download

    응답: DOCX 파일 (application/octet-stream)
    """
    try:
        # 기획서 생성 (스트리밍 없이 전체 생성)
        for _ in docx_generator.create_docx_report(
            request.meta,
            request.products,
            request.market_analysis,
            request.competitors,
            request.competitor_analysis
        ):
            pass

        # 메모리 DOCX 가져오기
        doc_bytes = docx_generator.save_docx_to_bytes()
        filename = docx_generator.generate_file_name(request.meta)

        return StreamingResponse(
            iter([doc_bytes.getvalue()]),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        return {"error": str(e)}, 400


# === 정적 파일 서빙 (React SPA) ===

# React dist 폴더가 있으면 마운트
dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(dist_path):
    @app.get("/")
    async def serve_index():
        """index.html 서빙"""
        return FileResponse(os.path.join(dist_path, "index.html"))

    # 정적 파일 마운트 (마지막에 위치해야 함)
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="static")
else:
    @app.get("/")
    async def serve_spa():
        """React 빌드 없을 때 안내"""
        return {"message": "React 빌드가 필요합니다. 'cd frontend && npm run build' 실행"}


# === 에러 핸들러 ===

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 에러 핸들러"""
    return {"error": str(exc)}, 500


# === 실행 ===

if __name__ == "__main__":
    import uvicorn

    # 포트 3000에서 실행
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3000,
        log_level="info"
    )
