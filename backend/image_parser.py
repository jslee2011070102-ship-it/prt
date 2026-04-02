"""
Claude Vision API를 통한 이미지 파싱
- 카테고리 스크린샷 → Product 배열 추출
- 경쟁사 상세페이지 → Competitor 정보 추출
"""

import base64
import json
import time
from io import BytesIO
from typing import List, Optional
from PIL import Image
from anthropic import Anthropic
from fastapi import UploadFile

from models import Product, Competitor, FormType


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
    "volume_text": "470ml, 2개",
    "sales_text": "2000명+",
    "form_type": "용기형"
  }
]

주의사항:
- form_type 분류: 용기형(펌프 또는 일반 용기 단품), 리필파우치(파우치 형태 리필), 대용량(4L 이상 말통/대용량), 기타(분류 불가)
- 이미지에 보이지 않는 항목은 null로 처리
- 판매량("구매했어요 N만명+")이 보이지 않으면 sales_text는 null
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

        # 이미지 포맷 감지
        if image.format == "PNG":
            media_type = "image/png"
        elif image.format in ["JPEG", "JPG"]:
            media_type = "image/jpeg"
        elif image.format == "WEBP":
            media_type = "image/webp"
        else:
            # 기본값: JPEG로 변환
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


# === 이미지 파싱 함수 ===

async def parse_category_images(
    image_files: List[UploadFile],
    client: Anthropic
) -> List[Product]:
    """
    카테고리 스크린샷 배열을 파싱하여 상품 정보 추출

    Args:
        image_files: 업로드된 이미지 파일 리스트
        client: Anthropic 클라이언트

    Returns:
        추출된 Product 객체 배열
    """
    all_products = []

    for idx, file in enumerate(image_files):
        # 이미지 읽기
        image_data = await file.read()

        try:
            # base64 인코딩
            encoded, media_type = encode_image_to_base64(image_data)

            # Claude Vision API 호출
            message = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": encoded,
                                },
                            },
                            {
                                "type": "text",
                                "text": PARSE_CATEGORY_PROMPT
                            }
                        ],
                    }
                ],
            )

            # JSON 파싱
            response_text = message.content[0].text.strip()

            # JSON 배열 추출 (마크다운 코드블록 제거)
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            products_data = json.loads(response_text)

            # Product 객체로 변환
            for product_data in products_data:
                try:
                    # sales_estimate 계산
                    if product_data.get("sales_text") and not product_data.get("sales_estimate"):
                        product_data["sales_estimate"] = parse_sales_estimate(product_data["sales_text"])

                    # form_type enum 변환
                    if product_data.get("form_type"):
                        form_type_str = product_data["form_type"]
                        product_data["form_type"] = FormType(form_type_str)

                    product = Product(**product_data)
                    all_products.append(product)
                except Exception as e:
                    # 개별 상품 파싱 실패 시 로그만 남기고 계속 진행
                    print(f"상품 파싱 실패: {str(e)}")
                    continue

        except json.JSONDecodeError as e:
            # JSON 파싱 실패 시 해당 이미지만 건너뛰고 계속
            print(f"이미지 {idx + 1} JSON 파싱 실패: {str(e)}")
            continue

        except Exception as e:
            # Claude API 호출 실패 시 계속
            print(f"이미지 {idx + 1} 파싱 중 오류: {str(e)}")
            continue

        # Rate limit 방지를 위해 이미지 간 대기
        if idx < len(image_files) - 1:
            time.sleep(1)

    return all_products


async def parse_competitor_images(
    competitor_name: str,
    image_files: List[UploadFile],
    client: Anthropic
) -> Competitor:
    """
    경쟁사 상세페이지 스크린샷을 파싱하여 경쟁사 정보 추출

    Args:
        competitor_name: 경쟁사 브랜드명 (사용자 입력)
        image_files: 업로드된 이미지 파일 리스트
        client: Anthropic 클라이언트

    Returns:
        추출된 Competitor 객체
    """
    competitor_data = {"name": competitor_name}

    for idx, file in enumerate(image_files):
        image_data = await file.read()

        try:
            # base64 인코딩
            encoded, media_type = encode_image_to_base64(image_data)

            # Claude Vision API 호출
            message = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": encoded,
                                },
                            },
                            {
                                "type": "text",
                                "text": PARSE_COMPETITOR_PROMPT
                            }
                        ],
                    }
                ],
            )

            # JSON 파싱
            response_text = message.content[0].text.strip()

            # JSON 객체 추출 (마크다운 코드블록 제거)
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            parsed_data = json.loads(response_text)

            # 첫 번째 이미지는 전체 데이터 덮어쓰기, 이후는 병합
            if idx == 0:
                competitor_data.update(parsed_data)
            else:
                # 리스트 필드는 병합, 텍스트 필드는 추가
                for key, value in parsed_data.items():
                    if isinstance(value, list) and key in competitor_data:
                        if isinstance(competitor_data[key], list):
                            competitor_data[key].extend(value)
                    elif value is not None:
                        competitor_data[key] = value

        except json.JSONDecodeError as e:
            print(f"경쟁사 이미지 {idx + 1} JSON 파싱 실패: {str(e)}")
            continue

        except Exception as e:
            print(f"경쟁사 이미지 {idx + 1} 파싱 중 오류: {str(e)}")
            continue

        # Rate limit 방지
        if idx < len(image_files) - 1:
            time.sleep(1)

    # Competitor 객체 생성
    return Competitor(**competitor_data)
