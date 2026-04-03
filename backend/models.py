"""
데이터 모델 정의 (Pydantic)
- Product: 카테고리 상품 정보
- Competitor: 경쟁사 상세페이지 정보
- SessionMeta: 세션 메타데이터 (브랜드명, 카테고리명)
- API 요청/응답 모델
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime


# === 기본 데이터 모델 ===

class Product(BaseModel):
    """쿠팡 카테고리 상품 정보"""
    rank: int = Field(..., description="순위")
    name: str = Field(..., description="상품명 전체")
    brand: str = Field(..., description="브랜드명")
    price: int = Field(..., description="판매가 (원)")
    discount_price: Optional[int] = Field(None, description="할인가 (원)")
    review_count: int = Field(default=0, description="리뷰 수")
    rating: float = Field(default=0.0, description="평점")
    volume_text: Optional[str] = Field(None, description="용량 원본 텍스트 (예: '470ml, 2개')")
    unit_price_label: Optional[str] = Field(None, description="단위당 단가 기준 (예: '100ml당', '1정당', '100g당')")
    price_per_100ml: Optional[float] = Field(None, description="단위당 단가 (unit_price_label 기준)")
    sales_text: Optional[str] = Field(None, description="판매량 원본 — '구매했어요' 기준만 (예: '4만명+')")
    sales_estimate: Optional[int] = Field(None, description="판매량 숫자 (예: 40000)")
    revenue_estimate: Optional[int] = Field(None, description="추정 월매출 (가격 × 판매량 × 2)")
    form_type: Optional[str] = Field(None, description="상품 형태 (자유 텍스트, 예: '알약', '액상', '용기형')")
    url: Optional[str] = Field(None, description="쿠팡 상품 URL")

    @model_validator(mode="after")
    def calculate_revenue_estimate(self):
        """추정 월매출 자동 계산: 판매가 × 판매량 × 2

        [수정 이유] Pydantic v2에서 field_validator는 해당 필드가 입력에 없으면
        실행되지 않음. model_validator(mode='after')는 항상 실행됨.
        """
        if self.revenue_estimate is None and self.price and self.sales_estimate:
            try:
                self.revenue_estimate = int(self.price * self.sales_estimate * 2)
            except (TypeError, ValueError):
                pass
        return self


class Competitor(BaseModel):
    """경쟁사 상세페이지 정보"""
    name: str = Field(..., description="브랜드명")
    url: Optional[str] = Field(None, description="상품 URL")
    product_name: Optional[str] = Field(None, description="상품명")
    price_options: Optional[List[dict]] = Field(None, description="가격 옵션 (List[{quantity, price}])")
    review_count: Optional[int] = Field(None, description="리뷰 수")
    rating: Optional[float] = Field(None, description="평점")
    usp_points: Optional[List[str]] = Field(None, description="USP 소구 포인트")
    certifications: Optional[List[str]] = Field(None, description="보유 인증 목록")
    positive_keywords: Optional[List[str]] = Field(None, description="긍정 키워드")
    negative_keywords: Optional[List[str]] = Field(None, description="부정 키워드")
    key_ingredients: Optional[List[str]] = Field(None, description="주요 성분")
    raw_claims: Optional[str] = Field(None, description="원문 클레임 및 문구")


class SessionMeta(BaseModel):
    """세션 메타데이터 - 모든 Step에서 유지됨"""
    brand_name: str = Field(..., description="브랜드명 (필수)")
    category_name: str = Field(..., description="카테고리명 (필수)")


# === API 요청 모델 ===

class ParseCategoryImagesRequest(BaseModel):
    """카테고리 이미지 파싱 요청"""
    # multipart/form-data로 전송되므로 여기서 정의하지 않음
    pass


class ParseCompetitorImagesRequest(BaseModel):
    """경쟁사 이미지 파싱 요청"""
    competitor_name: str = Field(..., description="경쟁사 브랜드명")
    # multipart/form-data로 이미지 전송


class MarketAnalysisRequest(BaseModel):
    """시장 분석 요청"""
    products: List[Product] = Field(..., description="상품 데이터")
    brand_name: str = Field(..., description="우리 브랜드명")
    category_name: str = Field(..., description="카테고리명")


class CompetitorAnalysisRequest(BaseModel):
    """경쟁사 분석 요청"""
    competitors: List[Competitor] = Field(..., description="경쟁사 데이터")
    market_summary: str = Field(..., description="Step 2 시장 분석 결과 전문")
    brand_name: str = Field(..., description="우리 브랜드명")


class ReportRequest(BaseModel):
    """기획서 생성 요청"""
    meta: SessionMeta = Field(..., description="세션 메타데이터")
    products: List[Product] = Field(..., description="상품 데이터")
    market_analysis: str = Field(..., description="Step 2 시장 분석 결과")
    competitors: List[Competitor] = Field(..., description="경쟁사 데이터")
    competitor_analysis: str = Field(..., description="Step 3 경쟁사 분석 결과")


# === API 응답 모델 ===

class ParseCategoryImagesResponse(BaseModel):
    """카테고리 이미지 파싱 응답"""
    products: List[Product] = Field(..., description="파싱된 상품 배열")


class ParseCompetitorImagesResponse(BaseModel):
    """경쟁사 이미지 파싱 응답"""
    competitor: Competitor = Field(..., description="파싱된 경쟁사 정보")


class CompetitorCandidate(BaseModel):
    """경쟁사 후보 (Step 2에서 추출)"""
    name: str = Field(..., description="브랜드명")
    reason: str = Field(..., description="추천 이유")


class MarketAnalysisResponse(BaseModel):
    """시장 분석 응답"""
    analysis: str = Field(..., description="분석 결과 (마크다운)")
    competitor_candidates: List[CompetitorCandidate] = Field(..., description="경쟁사 후보")


# === 내부 처리용 모델 ===

class AnalysisState(BaseModel):
    """분석 진행 상태 추적"""
    current_step: int = Field(default=1, description="현재 Step")
    products: List[Product] = Field(default_factory=list)
    market_analysis: str = Field(default="")
    competitors: List[Competitor] = Field(default_factory=list)
    competitor_analysis: str = Field(default="")
    report_content: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.now)
