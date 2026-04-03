"""
Claude Vision API를 통한 이미지 파싱
- 카테고리 스크린샷 → Product 배열 추출
- 경쟁사 상세페이지 → Competitor 정보 추출

[비용 최적화]
- claude-haiku-4-5 모델 사용 (구조화 데이터 추출에 충분, 비용 ~75% 절감)
- 이미지 배치 처리 (BATCH_SIZE장 묶어서 1회 API 호출)
- max_tokens 축소 (JSON 출력에 필요한 만큼만)
"""

import base64
import json
from io import BytesIO
from typing import List, Optional
from PIL import Image
from anthropic import Anthropic
from fastapi import UploadFile

from models import Product, Competitor


# === 파싱 프롬프트 (최상단 상수) ===

PARSE_CATEGORY_PROMPT = """아래 쿠팡 카테고리 스크린샷에서 보이는 모든 상품 정보를 추출해줘.
다른 텍스트 없이 JSON 배열만 출력해.

응답 형식:
[
  {
    "rank": 1,
    "name": "상품명 전체",
    "brand": "브랜드명",
    "price": 5980,
    "review_count": 11613,
    "rating": 4.5,
    "volume_text": "250mg x 60cap",
    "unit_price_label": "1정당",
    "unit_price": 100,
    "sales_text": "2000명+",
    "form_type": "알약"
  }
]

주의사항:
- unit_price_label: 이미지에 표기된 단위 기준 그대로 추출 (예: "100ml당", "1정당", "100g당", "1개당"). 표기가 없으면 null
- unit_price: unit_price_label 기준 단가 숫자. 계산 불가능하면 null
- form_type: 카테고리 특성에 맞게 자유롭게 분류 (예: 건기식이면 "알약"/"액상"/"가루", 세제면 "용기형"/"리필파우치"/"대용량" 등)
- sales_text: 구매량을 나타내는 "N명+", "N만명+", "N천명+" 형태 숫자를 추출. "만족했어요"(리뷰 만족도) 옆에 있는 수치가 아닌, 구매 수량을 나타내는 수치만 추출. 확인 불가하면 null
- 이미지에 보이지 않는 항목은 null로 처리
- JSON 배열만 출력, 다른 텍스트는 없을 것"""

PARSE_COMPETITOR_PROMPT = """아래는 쿠팡 상품 상세페이지 스크린샷이다.
다음 항목을 추출해서 JSON으로만 출력해줘.

응답 형식:
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

주의사항:
- 보이지 않는 항목은 null 또는 빈 배열로 처리
- JSON만 출력, 다른 텍스트는 없을 것"""


# === 설정 ===

# 이미지 파싱용 모델: Haiku (구조화 데이터 추출에 충분, 저렴)
IMAGE_PARSE_MODEL = "claude-haiku-4-5-20251001"

# 카테고리 이미지 배치 크기 (한 번 API 호출당 처리할 이미지 수)
BATCH_SIZE = 5


# === 유틸리티 함수 ===

def encode_image_to_base64(image_data: bytes) -> tuple[str, str]:
    """
    이미지 데이터를 base64로 인코딩

    Args:
        image_data: 이미지 바이너리 데이터

    Returns:
        (base64_string, media_type) 튜플
    """
    try:
        image = Image.open(BytesIO(image_data))

        if image.format == "PNG":
            media_type = "image/png"
        elif image.format in ["JPEG", "JPG"]:
            media_type = "image/jpeg"
        elif image.format == "WEBP":
            media_type = "image/webp"
        else:
            media_type = "image/jpeg"
            output = BytesIO()
            image.convert("RGB").save(output, format="JPEG")
            image_data = output.getvalue()

        encoded = base64.b64encode(image_data).decode("utf-8")
        return encoded, media_type
    except Exception as e:
        raise ValueError(f"이미지 인코딩 실패: {str(e)}")


def parse_sales_estimate(sales_text: Optional[str]) -> Optional[int]:
    """
    판매량 텍스트를 숫자로 변환
    예: "4만명+" → 40000, "2천명+" → 2000
    """
    if not sales_text:
        return None

    sales_text = sales_text.strip().replace("명+", "").replace("명", "")

    try:
        if "만" in sales_text:
            return int(float(sales_text.replace("만", "")) * 10000)
        elif "천" in sales_text:
            return int(float(sales_text.replace("천", "")) * 1000)
        elif "백" in sales_text:
            return int(float(sales_text.replace("백", "")) * 100)
        else:
            return int(float(sales_text))
    except (ValueError, AttributeError):
        return None


def extract_json(response_text: str) -> str:
    """마크다운 코드블록에서 JSON 추출"""
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()
    return response_text


# === 이미지 파싱 함수 ===

async def parse_category_images(
    image_files: List[UploadFile],
    client: Anthropic
) -> List[Product]:
    """
    카테고리 스크린샷 배열을 파싱하여 상품 정보 추출

    [최적화]
    - BATCH_SIZE장씩 묶어서 1회 API 호출 → 호출 횟수 대폭 감소
    - Haiku 모델 사용 → 비용 ~75% 절감
    - max_tokens=3000 → 배치당 충분한 출력 확보

    Args:
        image_files: 업로드된 이미지 파일 리스트
        client: Anthropic 클라이언트

    Returns:
        추출된 Product 객체 배열
    """
    all_products = []

    # 이미지를 BATCH_SIZE씩 나누어 처리
    for batch_start in range(0, len(image_files), BATCH_SIZE):
        batch = image_files[batch_start:batch_start + BATCH_SIZE]

        # 배치 내 이미지 인코딩
        content = []
        for file in batch:
            image_data = await file.read()
            try:
                encoded, media_type = encode_image_to_base64(image_data)
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": encoded,
                    },
                })
            except Exception as e:
                print(f"이미지 인코딩 실패: {str(e)}")
                continue

        if not content:
            continue

        # 프롬프트 추가
        content.append({
            "type": "text",
            "text": f"위 {len(batch)}장의 이미지에서 보이는 모든 상품 정보를 추출해줘.\n\n" + PARSE_CATEGORY_PROMPT
        })

        try:
            message = client.messages.create(
                model=IMAGE_PARSE_MODEL,
                max_tokens=3000,
                messages=[{"role": "user", "content": content}],
            )

            response_text = extract_json(message.content[0].text)
            products_data = json.loads(response_text)

            for product_data in products_data:
                try:
                    # unit_price → price_per_100ml 필드명 변환
                    if "unit_price" in product_data:
                        product_data["price_per_100ml"] = product_data.pop("unit_price")

                    # 판매량 숫자 변환
                    if product_data.get("sales_text") and not product_data.get("sales_estimate"):
                        product_data["sales_estimate"] = parse_sales_estimate(product_data["sales_text"])

                    # 추정매출 직접 계산 (model_validator 이중 보장)
                    price = product_data.get("price")
                    sales_est = product_data.get("sales_estimate")
                    if price and sales_est and not product_data.get("revenue_estimate"):
                        product_data["revenue_estimate"] = int(price * sales_est * 2)

                    # 디버그 로그 (터미널에서 확인 가능)
                    rank = product_data.get("rank", "?")
                    name = product_data.get("name", "")[:20]
                    stxt = product_data.get("sales_text")
                    sest = product_data.get("sales_estimate")
                    rev  = product_data.get("revenue_estimate")
                    print(f"  [상품{rank}] {name} | sales_text={stxt} | sales_estimate={sest} | revenue={rev}")

                    all_products.append(Product(**product_data))
                except Exception as e:
                    print(f"상품 파싱 실패: {str(e)}")
                    continue

        except json.JSONDecodeError as e:
            print(f"배치 {batch_start // BATCH_SIZE + 1} JSON 파싱 실패: {str(e)}")
            continue
        except Exception as e:
            print(f"배치 {batch_start // BATCH_SIZE + 1} 파싱 중 오류: {str(e)}")
            continue

    return all_products


async def parse_competitor_images(
    competitor_name: str,
    image_files: List[UploadFile],
    client: Anthropic
) -> Competitor:
    """
    경쟁사 상세페이지 스크린샷을 파싱하여 경쟁사 정보 추출

    [최적화]
    - 경쟁사의 모든 이미지를 1회 API 호출로 처리
    - Haiku 모델 사용 → 비용 ~75% 절감
    - max_tokens=1500 → 경쟁사 JSON 출력에 충분

    Args:
        competitor_name: 경쟁사 브랜드명 (사용자 입력)
        image_files: 업로드된 이미지 파일 리스트
        client: Anthropic 클라이언트

    Returns:
        추출된 Competitor 객체
    """
    competitor_data = {"name": competitor_name}

    # 모든 이미지를 한 번에 인코딩
    content = []
    for file in image_files:
        image_data = await file.read()
        try:
            encoded, media_type = encode_image_to_base64(image_data)
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": encoded,
                },
            })
        except Exception as e:
            print(f"이미지 인코딩 실패: {str(e)}")
            continue

    if not content:
        return Competitor(**competitor_data)

    # 프롬프트 추가
    content.append({
        "type": "text",
        "text": f"위 {len(image_files)}장의 이미지를 종합해서 분석해줘.\n\n" + PARSE_COMPETITOR_PROMPT
    })

    try:
        message = client.messages.create(
            model=IMAGE_PARSE_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": content}],
        )

        response_text = extract_json(message.content[0].text)
        parsed_data = json.loads(response_text)
        competitor_data.update(parsed_data)

    except json.JSONDecodeError as e:
        print(f"경쟁사 JSON 파싱 실패: {str(e)}")
    except Exception as e:
        print(f"경쟁사 파싱 중 오류: {str(e)}")

    return Competitor(**competitor_data)
