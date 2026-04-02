# CLAUDE.md — Product Research Tool

## 프로젝트 개요

쿠팡 카테고리 신제품 기획 시 반복되는 리서치 작업을 자동화하는 범용 내부 툴.
어떤 브랜드, 어떤 카테고리에서도 사용 가능.
상세 요구사항은 `PRD.md`를 반드시 먼저 읽고 시작할 것.

## 시작 전 필독

1. `PRD.md` 전체 읽기
2. `reference/기획서_스타일_레퍼런스.docx` — DOCX 출력 스타일 기준 파일

## 개발 순서 (반드시 이 순서로)

1. `backend/models.py` — 데이터 모델 먼저
2. `backend/image_parser.py` — Claude Vision 파싱
3. `backend/analyzer.py` — 시장/경쟁사 분석
4. `backend/docx_generator.py` — DOCX 생성
5. `backend/main.py` — FastAPI 앱 + 정적 파일 서빙
6. `frontend/` — React 앱 (Step1 → Step2 → Step3 → Step4 순서)

## 핵심 규칙

### 브랜드 중립성
- 코드 어디에도 특정 브랜드명을 하드코딩하지 말 것
- 브랜드명, 카테고리명은 항상 사용자 입력값(SessionMeta)에서 가져올 것
- 프롬프트 내 브랜드명은 `{brand_name}` 변수로 동적 치환

### API 키
- `.env` 파일에서 `ANTHROPIC_API_KEY` 로드
- 코드에 하드코딩 절대 금지

### Claude API
- 모델: `claude-sonnet-4-5`
- 스트리밍 응답: FastAPI `StreamingResponse` + 프론트 `EventSource`
- 프롬프트: 각 파일 최상단 상수로 정의 (함수 안에 넣지 말 것)

### 이미지 파싱
- `POST /api/parse/category-images`: 카테고리 스크린샷 → Product 배열
- `POST /api/parse/competitor-images`: 상세페이지 스크린샷 → Competitor 객체
- 이미지는 base64로 인코딩해서 Claude Vision API에 전달
- 파싱 실패 시 에러 대신 null 필드로 처리 (부분 성공 허용)

### 프론트엔드
- 전역 상태: Zustand 사용 (Step 간 데이터 유지)
- Step 진행: 이전 Step 완료 전까지 다음 Step 비활성화
- 스트리밍: `EventSource`로 SSE 수신, 실시간 텍스트 표시

### DOCX 생성
- `reference/기획서_스타일_레퍼런스.docx` 스타일 참고
- 헤더: #2E75B6, 폰트: Arial
- 테이블 헤더 배경: #2E75B6 (흰 글씨), 홀수 행: #EBF3FB
- python-docx 사용
- 파일명: `{brand_name}_{category_name}_기획서_{YYYYMMDD}.docx`

### 실행
- `python backend/main.py` 한 줄로 백엔드 시작
- 프론트엔드 빌드 결과물(`frontend/dist`)을 FastAPI가 정적 파일로 서빙
- 포트: 3000

## 금지사항

- 특정 브랜드명 하드코딩 금지
- 쿠팡 크롤링 코드 작성 금지 (Phase 2에서 별도 구현)
- 외부 DB 사용 금지 (Phase 1은 세션 메모리만)
- 복잡한 인증/로그인 기능 추가 금지 (내부 툴이므로 불필요)
