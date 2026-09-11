import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from web.backend.notifications import build_status_notification_text


class SellerNotificationTextTests(unittest.TestCase):
    def test_build_status_notification_text_includes_comment(self):
        text = build_status_notification_text("damaged", "Проверьте коробку и упаковку")

        self.assertIn("повреждения", text.lower())
        self.assertIn("Проверьте коробку и упаковку", text)

    def test_build_status_notification_text_handles_empty_comment(self):
        text = build_status_notification_text("normal", "")

        self.assertIn("нормальное", text.lower())
        self.assertNotIn("Комментарий", text)


if __name__ == "__main__":
    unittest.main()
