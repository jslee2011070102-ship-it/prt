"""
Step 2, 3의 Claude API 분석 (스트리밍)
- 시장 분석: 6가지 항목 분석 + 경쟁사 후보 추출
- 경쟁사 USP 분석: 경쟁사별 USP + 인증 제안
"""

import json
import re
from typing import List, Dict, Generator, Optional
from anthropic import Anthropic

from models import Product, Competitor


# === 분석 프롬프트 (최상단 상수) ===

MARKET_ANALYSIS_PROMPT = """다음 쿠팡 {category_name} 카테고리 TOP 25 데이터를 분석해줘.

[데이터]
{products_json}

우리 브랜드명은 "{brand_name}"이야.
아래 순서로 분석 결과를 마크다운으로 작성해줘.
각 섹션은 명확한 제목(## 1. ~ ## 6.)으로 시작할 것.

## 1. 가격대 분포 분석
형태별(용기형/리필파우치/대용량) × 가격 세그먼트(저가/중가/고가) 매트릭스 테이블.
세그먼트별 추정 월매출 합계와 {brand_name} 진입 적합도(★ 5점 기준) 포함.

## 2. 브랜드 구조 분석
브랜드별 추정 매출 점유율. 대기업PB / 중소브랜드 / 수입브랜드 구분.

## 3. 향·기능별 매출 집계
상품명에서 향/기능 키워드를 추출하고 그룹핑. 키워드별 추정 매출 순위.

## 4. 공백 포지션 식별
경쟁자가 없거나 약한 가격×형태 조합. {brand_name}에게 유리한 진입 포인트.

## 5. 신제품 스펙 제안
- 추천 형태 + 용량
- 목표 100ml당 단가
- 1차 출시 키워드/향/기능 추천 (매출 상위 기준, 이유 포함)
- {brand_name} 포지셔닝 한 줄 요약

## 6. 경쟁사 후보 추천
분석 결과를 바탕으로 {brand_name}이 직접 벤치마킹해야 할 경쟁사 5~7개.
각 브랜드명과 추천 이유(1줄) 포함. 형식:
- 브랜드명1: 추천 이유
- 브랜드명2: 추천 이유
(이후 계속...)"""

COMPETITOR_ANALYSIS_PROMPT = """다음 {N}개 경쟁사 데이터를 분석해서 {brand_name} 신제품의 USP와 예정 인증을 제안해줘.

[경쟁사 데이터]
{competitors_json}

[Step 2 시장 분석 요약]
{market_summary}

아래 순서로 분석 결과를 마크다운으로 작성해줘.

## 1. 경쟁사별 USP 요약
각 경쟁사의 핵심 차별화 포인트 3줄 이내.

## 2. 인증 비교 테이블
인증 항목 × 경쟁사 매트릭스. {brand_name} 보유 여부도 포함.
마크다운 테이블 형식.

## 3. {brand_name} USP 제안
경쟁사 최상의 강점을 이식하고 공백을 공략하는 USP 7개 이내.
각 USP마다: 소구 문구 + 이식한 경쟁사 + 차별화 근거.

## 4. 예정 인증 제안
경쟁사 보유 인증(기본값 충족) + {brand_name} 추가 제안 인증(차별화).
각 인증마다: 항목명 + 시험기관 + 경쟁사 보유 여부 + 전략."""


# === 스트리밍 함수 ===

def analyze_market(
    products: List[Product],
    brand_name: str,
    category_name: str,
    client: Anthropic
) -> Generator[str, None, None]:
    """
    시장 분석 (Step 2)
    - 6가지 분석 항목 생성
    - 경쟁사 후보 추출
    - StreamingResponse 호환 제너레이터

    Args:
        products: Product 배열
        brand_name: 브랜드명
        category_name: 카테고리명
        client: Anthropic 클라이언트

    Yields:
        분석 텍스트 청크
    """
    # 상품 데이터를 JSON으로 변환
    products_json = json.dumps(
        [p.model_dump(exclude_none=True) for p in products],
        ensure_ascii=False,
        indent=2
    )

    # 프롬프트 작성
    prompt = MARKET_ANALYSIS_PROMPT.format(
        category_name=category_name,
        brand_name=brand_name,
        products_json=products_json
    )

    # 스트리밍 요청
    with client.messages.stream(
        model="claude-sonnet-4-5",
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    ) as stream:
        for text in stream.text_stream:
            yield text


def analyze_competitor(
    competitors: List[Competitor],
    market_summary: str,
    brand_name: str,
    client: Anthropic
) -> Generator[str, None, None]:
    """
    경쟁사 USP 분석 (Step 3)
    - 경쟁사별 USP 요약
    - 인증 비교
    - 우리 브랜드 USP 제안
    - 예정 인증 제안

    Args:
        competitors: Competitor 배열
        market_summary: Step 2 분석 결과 전문
        brand_name: 브랜드명
        client: Anthropic 클라이언트

    Yields:
        분석 텍스트 청크
    """
    # 경쟁사 데이터를 JSON으로 변환
    competitors_json = json.dumps(
        [c.model_dump(exclude_none=True) for c in competitors],
        ensure_ascii=False,
        indent=2
    )

    # 프롬프트 작성
    prompt = COMPETITOR_ANALYSIS_PROMPT.format(
        N=len(competitors),
        brand_name=brand_name,
        competitors_json=competitors_json,
        market_summary=market_summary
    )

    # 스트리밍 요청
    with client.messages.stream(
        model="claude-sonnet-4-5",
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    ) as stream:
        for text in stream.text_stream:
            yield text


# === 보조 함수 ===

def extract_competitors_from_analysis(analysis_text: str) -> List[Dict[str, str]]:
    """
    Step 2 분석 결과에서 경쟁사 후보 추출

    경쟁사 후보 추천 섹션에서 다음 형식의 브랜드명 + 이유를 파싱:
    - 브랜드명1: 추천 이유
    - 브랜드명2: 추천 이유

    Args:
        analysis_text: Step 2 분석 결과 전문

    Returns:
        List[{"name": "브랜드명", "reason": "추천 이유"}]
    """
    competitors = []

    # 섹션 6 찾기 (## 6. 경쟌사/경쟁사 후보 추천 패턴을 유연하게 매칭)
    match = re.search(r'##\s*6[^\n]*경[쟁쟌]\s*사[^\n]*(.*?)(?=##\s*\d|\Z)', analysis_text, re.DOTALL)
    if not match:
        return competitors

    section_text = match.group(1)

    # "- 브랜드명: 이유" 형식 파싱
    pattern = r'^-\s+([^:]+?)\s*:\s*(.+?)$'
    for line in section_text.split('\n'):
        line = line.strip()
        if not line:
            continue

        match = re.match(pattern, line)
        if match:
            name = match.group(1).strip()
            reason = match.group(2).strip()
            if name and reason:
                competitors.append({"name": name, "reason": reason})

    return competitors
