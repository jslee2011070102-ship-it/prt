# 🎯 Product Research Tool - 쿠팡 카테고리 신제품 기획 자동화

> **Claude Vision + Claude API를 활용한 자동화된 시장 분석 및 기획서 생성 도구**

쿠팡 카테고리 신제품 기획 시 **30분 안에 기획서 초안 완성**.
어떤 브랜드, 어떤 카테고리에서도 사용 가능한 범용 내부 도구.

## ⚡ 빠른 시작 (5분)

### 1️⃣ 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 텍스트 에디터로 열어서 ANTHROPIC_API_KEY=sk-ant-... 입력
```

### 2️⃣ Python 의존성 설치
```bash
pip install -r requirements.txt
```

### 3️⃣ 프론트엔드 빌드 (React)
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4️⃣ 애플리케이션 실행
```bash
python backend/main.py
# → http://localhost:3000 자동으로 열림
```

> **개발 중인 경우**: 별도 터미널에서 `cd frontend && npm run dev` (포트 5173)

## 📋 사용 방법 (4 Steps)

### Step 1️⃣ — 데이터 수집 (이미지 파싱)
```
1. 브랜드명, 카테고리명 입력 (예: "한글톡", "주방세제")
2. 쿠팡 카테고리 스크린샷 (1~25위) 최대 25개를 드래그앤드롭
3. Claude Vision이 자동으로 상품 정보 추출 → 테이블 채움
4. 필요시 테이블에서 직접 수정 (인라인 편집, CSV 가능)
5. "분석 시작" 버튼 클릭 (상품 5개 이상 필수)
```

### Step 2️⃣ — 시장 분석 (실시간 스트리밍)
```
1. 6가지 분석 항목 자동 생성:
   ✓ 가격대 분포 분석 (세그먼트별 매트릭스)
   ✓ 브랜드 구조 분석 (점유율 분석)
   ✓ 향·기능별 매출 집계
   ✓ 공백 포지션 식별
   ✓ 신제품 스펙 제안
   ✓ 경쟁사 후보 추천 (5~7개)
2. 우측에서 경쟁사 후보 카드 확인
3. "경쟁사 분석" 버튼 클릭
```

### Step 3️⃣ — 경쟁사 USP 분석
```
Sub-step A: 경쟁사 선택
- Step 2 추천 경쟁사를 카드에서 체크 (기본 5개)
- URL 입력 필드 (선택사항)

Sub-step B: 이미지 업로드
- 각 경쟁사 상세페이지 스크린샷 업로드 (여러 장 가능)

Sub-step C: USP 분석 (실시간 스트리밍)
- 경쟁사별 USP 요약
- 인증 비교 테이블
- 우리 브랜드 USP 제안
- 예정 인증 제안
```

### Step 4️⃣ — 기획서 생성 (자동 DOCX 생성)
```
1. 기획서 메타정보 확인 (브랜드명, 카테고리명, 작성일)
2. 5개 섹션 자동 생성 (실시간 스트리밍):
   ✓ 1. 시장 분석 (TOP 25 테이블 + 인사이트)
   ✓ 2. 가격대 분포 분석
   ✓ 3. 신제품 진출 전략
   ✓ 4. 매출 목표 및 KPI
   ✓ 5. USP 및 예정 인증
3. 좌측에서 섹션별 완료 체크 확인
4. "📥 DOCX 다운로드" 버튼 클릭
   → 자동 저장: {브랜드명}_{카테고리명}_기획서_{날짜}.docx
```

---

## 🔑 핵심 특징

| 기능 | 설명 |
|------|------|
| 🤖 Claude Vision | 이미지에서 상품 정보 자동 추출 |
| 📊 SSE 스트리밍 | 분석 중간 결과 실시간 표시 |
| 📄 자동 DOCX 생성 | 프로페셔널 기획서 자동 생성 |
| 🎨 인라인 편집 | 테이블에서 직접 데이터 수정 |
| 📥 CSV 지원 | 이전 분석 재사용 가능 |
| 🌐 SPA 웹앱 | 브라우저만 필요 (설치 불필요) |

---

## 🏗️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | Python 3.11+ / FastAPI / Anthropic SDK / python-docx |
| **Frontend** | React 18 / Vite / TailwindCSS / Zustand |
| **API** | Claude Sonnet 4.5 (Vision + Text) |
| **데이터 검증** | Pydantic v2 |

---

## 📡 API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/parse/category-images` | 카테고리 이미지 파싱 → Product[] |
| POST | `/api/parse/competitor-images` | 경쟁사 이미지 파싱 → Competitor |
| POST | `/api/analyze/market` | 시장 분석 (SSE 스트리밍) |
| POST | `/api/analyze/competitor` | 경쟁사 분석 (SSE 스트리밍) |
| POST | `/api/report/generate` | 기획서 생성 (SSE 스트리밍) |
| POST | `/api/report/download` | DOCX 파일 다운로드 |

---

## 🎨 DOCX 스타일

생성되는 기획서의 포맷:

```
헤더 색상:    #2E75B6 (파란색)
폰트:         Arial
H1/H2:        Bold, 색상 #2E75B6
테이블 헤더:  #2E75B6 배경 + 흰 글씨
테이블 홀수행: #EBF3FB 배경 (연한 파란색)
페이지 여백:  상하좌우 1인치
파일명:       {브랜드}_{카테고리}_기획서_20260402.docx
```
