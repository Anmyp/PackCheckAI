import logging
import asyncio
import base64
import json
from typing import Tuple
from io import BytesIO
from .config import settings
import httpx
from PIL import Image

logger = logging.getLogger(__name__)

def resize_image(image_bytes: bytes, max_size: int = 1024) -> bytes:
  
    img = Image.open(BytesIO(image_bytes))

    if img.mode in ("RGBA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[-1])
        else:
            background.paste(img)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    return buffer.getvalue()


class AIService:
    #МЕНЯЙ ТОЛЬКО ЭТО ЗНАЧЕНИЕ: True = прокси, False = напрямую/VPN
    USE_PROXY = True 
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY.strip()
        self.model = settings.OPENAI_MODEL.strip() or "gpt-4o"
        self.base_url = "https://api.openai.com/v1/chat/completions"
        
        raw_proxy = "socks5://yyRZkMcA:zQ8WMyL4@172.120.189.135:63893"
        self.proxy_url = raw_proxy if self.USE_PROXY else None

        status = "ВКЛЮЧЕН" if self.proxy_url else "ОТКЛЮЧЕН (VPN/напрямую)"
        logger.info(f"OpenAI config: model={self.model}, proxy={status}")

        if not self.api_key.startswith("sk-"):
            logger.warning("OpenAI API ключ не начинается с 'sk-' — возможно, невалидный")

    async def analyze_photo(self, photo_bytes: bytes) -> Tuple[str, float]:
        logger.info(f"🤖 Запрос к OpenAI ({len(photo_bytes):,} байт)")

        try:
            compressed_bytes = await asyncio.get_running_loop().run_in_executor(
                None, resize_image, photo_bytes, 1024
            )
            logger.info(f"🖼️ Изображение сжато до {len(compressed_bytes):,} байт")
        except Exception as e:
            logger.warning(f"Не удалось сжать изображение: {e}. Используем оригинал.")
            compressed_bytes = photo_bytes

        b64_image = base64.b64encode(compressed_bytes).decode("utf-8")
        image_url = f"data:image/jpeg;base64,{b64_image}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an automated package damage detection system used in logistics.\n\n"
                        "Your task is to analyze a single image of a parcel and classify its condition.\n\n"
                        "You must return ONLY valid JSON in the following format:\n\n"
                        "{\n"
                        "  \"result\": \"normal\" | \"damaged\" | \"review\",\n"
                        "  \"confidence\": integer from 0 to 100\n"
                        "}\n\n"
                        "Classification rules:\n"
                        "- normal → no visible structural damage\n"
                        "- damaged → visible tears, dents, holes, crushed corners, severe deformation\n"
                        "- review → unclear image, partial visibility, low lighting, obstruction, or uncertain damage\n\n"
                        "Strict requirements:\n"
                        "- No explanations\n"
                        "- No additional text\n"
                        "- No markdown\n"
                        "- No comments\n"
                        "- JSON only\n"
                        "- Confidence must reflect visual certainty"
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this parcel image."},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            "max_tokens": 100,
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=self.proxy_url,
                verify=False
            ) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)

            if response.status_code != 200:
                logger.error(f"OpenAI error {response.status_code}: {response.text}")
                return "review", 50.0

            data = response.json()
            raw_json = data["choices"][0]["message"]["content"].strip()

            try:
                result = json.loads(raw_json)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON from OpenAI: {raw_json} | Error: {e}")
                return "review", 50.0

            result_str: str = str(result.get("result", "")).lower()
            confidence_int: int = result.get("confidence", 50)
            confidence_int = max(0, min(100, confidence_int))

            valid_results = {"normal", "damaged", "review"}
            if result_str not in valid_results:
                result_str = "review"

            confidence_float = float(confidence_int) / 100.0
            logger.info(f"✅ OpenAI ответ: result='{result_str}', confidence={confidence_float:.1%}")

            return result_str, confidence_float

        except Exception as e:
            logger.exception(f"Ошибка при вызове OpenAI: {e}")
            return "review", 0.5


ai_service = AIService()