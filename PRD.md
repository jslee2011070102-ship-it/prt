# Product Research Tool — Phase 1 PRD

## 배경 및 목적

쿠팡 카테고리 신제품 기획 시 매번 반복되는 리서치 작업을 자동화하는 범용 내부 툴.
어떤 브랜드, 어떤 카테고리에서도 동일하게 사용 가능.

**현재 프로세스 (수작업)**
1. 쿠팡 카테고리 모바일 스크린샷 수동 캡쳐 (25장)
2. 데이터 정리 및 Claude 대화창에 이미지 첨부
3. Claude가 이미지 분석 → 수동으로 표 정리
4. 경쟁사 상세페이지 스크린샷 캡쳐
5. Claude 분석 → 기획서 수동 작성

**목표 프로세스 (자동화 후)**
1. 스크린샷 캡쳐 (그대로 유지 — 쿠팡 크롤링은 모바일 전용이라 Phase 2에서 검토)
2. 웹앱에 이미지 드래그앤드롭 → Claude Vision이 자동 파싱
3. 버튼 하나로 시장 분석 → 경쟁사 분석 → 기획서 생성

**Phase 1 목표**: 이미지 업로드만 하면 30분 안에 기획서 초안 완성

---

## 기술 스택

```
Backend  : Python 3.11+ / FastAPI / Anthropic SDK / python-docx
Frontend : React 18 / Vite / TailwindCSS
크롤링   : 없음 (Phase 1은 이미지 업로드만)
실행     : python backend/main.py → localhost:3000
```

---

## 파일 구조

```
product-research-tool/
├── backend/
│   ├── main.py                # FastAPI 앱 + React 정적 파일 서빙
│   ├── image_parser.py        # Claude Vision 이미지 파싱
│   ├── analyzer.py            # Claude API 시장/경쟁사 분석
│   ├── docx_generator.py      # DOCX 기획서 생성
│   └── models.py              # Pydantic 데이터 모델
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Step1Collect.jsx      # 이미지 업로드 + 테이블
│   │   │   ├── Step2Analysis.jsx     # 시장 분석 결과
│   │   │   ├── Step3Competitor.jsx   # 경쟁사 선정 + USP 분석
│   │   │   └── Step4Report.jsx       # 기획서 생성
│   │   ├── components/
│   │   │   ├── ImageUploadZone.jsx   # 드래그앤드롭 업로드
│   │   │   ├── EditableTable.jsx     # 인라인 편집 테이블
│   │   │   └── StreamingText.jsx     # Claude 스트리밍 출력
│   │   ├── store.js                  # Zustand 전역 상태 (Step 간 데이터)
│   │   └── api.js                    # 백엔드 API 호출
│   ├── index.html
│   └── package.json
├── reference/
│   └── 기획서_스타일_레퍼런스.docx   # DOCX 출력 스타일 기준
├── .env
├── requirements.txt
└── README.md
```

---

## Step 1 — 데이터 수집 화면

### 역할
쿠팡 카테고리 TOP 25 스크린샷을 업로드하면 Claude Vision이 자동으로 데이터를 추출해서 테이블에 채워준다.

### 세션 초기 입력 (분석 시작 전 필수)
- **브랜드명**: 텍스트 입력 (예: 허글리, 비트, 샤프란 등 — 우리 브랜드명)
- **카테고리명**: 텍스트 입력 (예: 주방세제, 캡슐세탁세제 등)

이 두 값은 이후 모든 분석 프롬프트와 기획서 파일명에 자동 반영됨.

### 이미지 업로드 존 (ImageUploadZone)
- 드래그앤드롭 또는 파일 선택으로 이미지 업로드
- 한 번에 최대 25장
- 지원 포맷: PNG, JPG, WEBP
- 업로드 즉시 백엔드 `/api/parse/category-images` 호출
- 파싱 진행 중 로딩 표시 ("이미지 분석 중... 3/5")
- 완료 시 테이블에 자동 채움

### Claude Vision 파싱 프롬프트 (image_parser.py 상수로 관리)

```
아래 쿠팡 카테고리 스크린샷에서 보이는 모든 상품 정보를 추출해줘.
다른 텍스트 없이 JSON 배열만 출력해.

[
  {
    "rank": 1,
    "name": "상품명 전체",
    "brand": "브랜드명",
    "price": 5980,
    "review_count": 11613,
    "rating": 4.5,
    "volume_text": "470ml, 2개",
    "sales_text": "2000명+",
    "form_type": "용기형"
  }
]

form_type 분류 기준:
- 용기형: 펌프 또는 일반 용기 단품
- 리필파우치: 파우치 형태 리필
- 대용량: 4L 이상 말통/대용량
- 기타: 분류 불가

이미지에 보이지 않는 항목은 null로 처리.
판매량("구매했어요 N만명+")이 보이지 않으면 sales_text는 null.
```

### 데이터 테이블 (EditableTable)
파싱 결과를 표로 표시. 모든 셀 인라인 편집 가능.

| 컬럼 | 타입 | 비고 |
|------|------|------|
| 순위 | 숫자 | 편집 가능 |
| 상품명 | 텍스트 | 편집 가능 |
| 브랜드 | 텍스트 | 편집 가능 |
| 판매가 | 숫자(원) | 편집 가능 |
| 용량 | 텍스트 | 편집 가능 |
| 100ml당 단가 | 숫자 | 자동 계산, 편집 가능 |
| 리뷰 수 | 숫자 | 편집 가능 |
| 평점 | 숫자 | 편집 가능 |
| 판매량 | 텍스트 | 편집 가능 ("4만명+") |
| 형태 | 드롭다운 | 용기형/리필파우치/대용량/기타 |
| 추정매출 | 숫자 | 자동 계산 (판매가 × 판매량추정 × 2) |

### 판매량 파싱 로직 (backend)
```python
# sales_text → 숫자 변환
"4만명+" → 40000
"2천명+" → 2000
"1만명+" → 10000
"500명+" → 500
```

### 테이블 하단 자동 집계
- 총 추정 월매출 합계
- 형태별 비율 (용기형 N개 / 리필 N개 / 대용량 N개)
- 100ml당 평균 단가

### 기타 기능
- 행 추가 / 삭제 버튼
- CSV 내보내기
- CSV 불러오기 (이전 작업 이어서 하기)
- "분석 시작 →" 버튼: 상품 5개 이상 입력 시 활성화

---

## Step 2 — 시장 분석 결과 화면

### 역할
Step 1 데이터를 Claude API에 전달, 시장 구조를 분석하고 우리 브랜드 진입 전략을 제안한다.

### 분석 요청 항목 (analyzer.py 프롬프트 상수)

```
다음 쿠팡 {카테고리명} 카테고리 TOP 25 데이터를 분석해줘.

[데이터 JSON]

우리 브랜드명은 "{브랜드명}"이야.
아래 순서로 분석 결과를 작성해줘:

## 1. 가격대 분포 분석
형태별(용기형/리필파우치/대용량) × 가격 세그먼트 매트릭스 테이블.
세그먼트별 추정 월매출 합계와 {브랜드명} 진입 적합도(★ 5점 기준) 포함.

## 2. 브랜드 구조 분석
브랜드별 추정 매출 점유율. 대기업PB / 중소브랜드 / 수입브랜드 구분.

## 3. 향·기능별 매출 집계
상품명에서 향/기능 키워드를 추출하고 그룹핑. 키워드별 추정 매출 순위.

## 4. 공백 포지션 식별
경쟁자가 없거나 약한 가격×형태 조합. {브랜드명}에게 유리한 진입 포인트.

## 5. 신제품 스펙 제안
- 추천 형태 + 용량
- 목표 100ml당 단가
- 1차 출시 키워드/향/기능 추천 (매출 상위 기준, 이유 포함)
- {브랜드명} 포지셔닝 한 줄 요약

## 6. 경쟁사 후보 추천
분석 결과를 바탕으로 {브랜드명}이 직접 벤치마킹해야 할 경쟁사 5~7개.
각 브랜드명과 추천 이유(1줄) 포함.
```

### 화면 레이아웃
- 좌측: 분석 텍스트 스트리밍 (SSE)
- 우측: 요약 테이블 고정 (세그먼트별 매출 집계 — 분석 완료 후 표시)
- 하단: "경쟁사 분석 →" 버튼 (분석 완료 후 활성화)

---

## Step 3 — 경쟁사 USP 분석 화면

### Sub-step A: 경쟁사 선정

Step 2에서 Claude가 추천한 후보를 카드로 표시.
각 카드에:
- 브랜드명
- 추천 이유 (Step 2 분석 결과에서 추출)
- 체크박스 (기본값: 상위 5개 선택)
- 쿠팡 상품 URL 입력 필드 (선택사항)

### Sub-step B: 상세페이지 이미지 업로드

선택된 경쟁사별로 이미지 업로드 존 제공.
각 경쟁사당 상세페이지 스크린샷 여러 장 업로드 가능.
"분석 시작" 클릭 시 경쟁사 순서대로 Claude Vision 파싱 진행.
진행 상태: "경쟁사 2/5 분석 중..."

### Claude Vision 경쟁사 파싱 프롬프트 (image_parser.py)

```
아래는 쿠팡 상품 상세페이지 스크린샷이다.
다음 항목을 추출해서 JSON으로만 출력해줘.

{
  "brand": "브랜드명",
  "product_name": "상품명",
  "price_options": [
    {"quantity": "1개", "price": 4750},
    {"quantity": "3개", "price": 11250}
  ],
  "review_count": 81786,
  "rating": 4.8,
  "usp_points": [
    "USP 소구 포인트 1",
    "USP 소구 포인트 2"
  ],
  "certifications": [
    "인증명 (기관명)"
  ],
  "positive_keywords": ["키워드1", "키워드2"],
  "negative_keywords": ["키워드1", "키워드2"],
  "key_ingredients": ["성분1", "성분2"],
  "raw_claims": "상세페이지에서 눈에 띄는 주요 문구들을 원문 그대로"
}

보이지 않는 항목은 null 또는 빈 배열.
```

### Sub-step C: USP 비교 분석

파싱된 경쟁사 데이터를 Claude API에 전달.

```
다음 {N}개 경쟁사 데이터를 분석해서 {브랜드명} 신제품의 USP와 예정 인증을 제안해줘.

[경쟁사 데이터 JSON]

## 1. 경쟁사별 USP 요약
각 경쟁사의 핵심 차별화 포인트 3줄 이내.

## 2. 인증 비교 테이블
인증 항목 × 경쟁사 매트릭스. {브랜드명} 보유 여부 포함.
형식: 마크다운 테이블

## 3. {브랜드명} USP 제안
경쟁사 최상의 강점을 이식하고 공백을 공략하는 USP 7개 이내.
각 USP마다: 소구 문구 + 이식한 경쟁사 + 차별화 근거.

## 4. 예정 인증 제안
경쟁사 보유 인증(기본값 충족) + {브랜드명} 추가 제안 인증(차별화).
각 인증마다: 항목명 + 시험기관 + 경쟁사 보유 여부 + 전략.
```

### 결과 화면
- 경쟁사별 요약 카드 (브랜드명, USP 3줄, 인증 배지)
- 전체 인증 비교 테이블 (✅/❌)
- "기획서 생성 →" 버튼

---

## Step 4 — 기획서 생성 화면

### 역할
Step 1~3 전체 데이터를 Claude API에 전달, DOCX 기획서 자동 생성.

### 입력 필드 (Step 1에서 입력한 값 자동 채워짐, 수정 가능)
- 브랜드명
- 카테고리명
- 작성일 (오늘 날짜 자동)

### 기획서 섹션 구조
```
1. 시장 분석
   - TOP 25 전체 테이블 (판매가, 100ml당, 판매량, 추정매출)
   - 핵심 인사이트 (3~5줄)

2. 가격대 분포 분석
   - 형태별 세그먼트 매트릭스 테이블
   - 진입 전략 방향

3. 신제품 진출 전략
   - 포지셔닝
   - 목표 단가 (형태별)
   - Phase별 출시 계획 테이블

4. 매출 목표 및 KPI
   - 단계별 매출 목표 테이블
   - 핵심 KPI

5. USP 및 예정 인증
   - 경쟁사 USP 비교표
   - 우리 브랜드 USP 제안 (번호 목록)
   - 예정 인증 테이블 (경쟁사 × 인증 항목)
```

### DOCX 스타일 기준
`reference/기획서_스타일_레퍼런스.docx` 파일을 스타일 레퍼런스로 사용.
- 헤더 색상: #2E75B6
- 폰트: Arial
- H1: bold 16pt, H2: bold 14pt
- 테이블: 헤더 행 #2E75B6 배경 흰 글씨, 홀수 행 #EBF3FB 배경
- 페이지 여백: 상하좌우 1인치

### 화면 구성
- 좌측: 기획서 섹션별 생성 진행 표시 (완료된 섹션에 ✅)
- 우측: 생성된 내용 미리보기 (텍스트)
- 하단: DOCX 다운로드 버튼 (전체 완료 후 활성화)

### 다운로드 파일명
`{브랜드명}_{카테고리명}_기획서_{YYYYMMDD}.docx`

---

## API 엔드포인트

```
POST /api/parse/category-images
  body: multipart/form-data (이미지 파일 배열)
  response: { products: Product[] }

POST /api/parse/competitor-images
  body: multipart/form-data (경쟁사명 + 이미지 파일 배열)
  response: { competitor: Competitor }

POST /api/analyze/market
  body: { products: Product[], brand_name: str, category_name: str }
  response: SSE 스트리밍 텍스트

POST /api/analyze/competitor
  body: { competitors: Competitor[], market_summary: str, brand_name: str }
  response: SSE 스트리밍 텍스트

POST /api/report/generate
  body: { products, market_analysis, competitors, competitor_analysis, meta }
  response: SSE 스트리밍 텍스트

POST /api/report/download
  body: { session_id: str }
  response: DOCX 파일 (application/octet-stream)
```

---

## 데이터 모델 (models.py)

```python
from pydantic import BaseModel
from typing import Optional, List

class Product(BaseModel):
    rank: int
    name: str
    brand: str
    price: int
    discount_price: Optional[int] = None
    review_count: int = 0
    rating: float = 0.0
    volume_text: Optional[str] = None
    volume_ml: Optional[float] = None
    price_per_100ml: Optional[float] = None
    sales_text: Optional[str] = None         # "4만명+" 원본
    sales_estimate: Optional[int] = None     # 파싱 숫자 (40000)
    revenue_estimate: Optional[int] = None   # 추정 월매출
    form_type: Optional[str] = None          # 용기형/리필파우치/대용량/기타
    url: Optional[str] = None

class Competitor(BaseModel):
    name: str
    url: Optional[str] = None
    product_name: Optional[str] = None
    price_options: Optional[List[dict]] = None
    review_count: Optional[int] = None
    rating: Optional[float] = None
    usp_points: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    positive_keywords: Optional[List[str]] = None
    negative_keywords: Optional[List[str]] = None
    key_ingredients: Optional[List[str]] = None
    raw_claims: Optional[str] = None

class SessionMeta(BaseModel):
    brand_name: str          # 필수 입력 — 기본값 없음
    category_name: str       # 필수 입력 — 기본값 없음

class ReportInput(BaseModel):
    meta: SessionMeta
    products: List[Product]
    market_analysis: str
    competitors: List[Competitor]
    competitor_analysis: str
```

---

## 환경변수 (.env)

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## requirements.txt

```
fastapi
uvicorn[standard]
anthropic
python-docx
pydantic
python-dotenv
httpx
pillow
python-multipart
```

---

## 실행 방법 (README)

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env에 ANTHROPIC_API_KEY 입력

# 2. Python 의존성 설치
pip install -r requirements.txt

# 3. 프론트엔드 빌드
cd frontend
npm install
npm run build
cd ..

# 4. 실행
python backend/main.py
# → http://localhost:3000 접속
```

---

## Claude API 설정

- 모델: `claude-sonnet-4-5`
- 스트리밍: FastAPI `StreamingResponse` + 프론트 `EventSource`
- Vision: `claude-sonnet-4-5` (이미지 파싱도 동일 모델)
- 프롬프트: `analyzer.py`, `image_parser.py`에 상수로 관리 (함수 밖 최상단)

---

## Phase 2 예정 (지금은 구현 안 함)

- 쿠팡 모바일 에뮬레이션 크롤링 (판매량 자동 수집)
- 분석 히스토리 저장 (SQLite)
- 카테고리 간 비교 기능
- 경쟁사 신제품 모니터링 (주 1회 자동)
