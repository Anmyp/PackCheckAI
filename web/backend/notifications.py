def build_status_notification_text(status: str, comment: str = "") -> str:
    """Build seller Telegram notification text for status update."""
    if status == "normal":
        text = "✅ Ваша посылка проверена модератором: состояние — нормальное."
    else:
        text = "⚠️ Ваша посылка проверена модератором: обнаружены повреждения."

    cleaned_comment = (comment or "").strip()
    if cleaned_comment:
        text += f"\nКомментарий модератора: {cleaned_comment}"

    return text
