import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location("https_setup", Path(__file__).with_name("finalize_https.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HttpsSetupTests(unittest.TestCase):
    def test_dns_does_not_allow_foreign_ipv6(self):
        self.assertFalse(module.dns_ready({"169.58.86.108", "2001:db8::1"}))
        self.assertFalse(module.dns_ready(set()))
        self.assertTrue(module.dns_ready({"169.58.86.108"}))

    def test_absent_dns_never_requests_certificate(self):
        with tempfile.TemporaryDirectory() as directory:
            clock = iter([0, 0, 0, 11])
            issuer = Mock()
            result = module.finish(Path(directory), 10, 10, resolver=lambda: set(), issuer=issuer,
                                   sleeper=lambda _: None, now=lambda: next(clock))
            self.assertEqual(result, 1)
            issuer.assert_not_called()

    def test_production_failure_is_not_retried(self):
        with tempfile.TemporaryDirectory() as directory:
            issuer = Mock(return_value="failed")
            result = module.finish(Path(directory), 10, 1, resolver=lambda: {"169.58.86.108"},
                                   issuer=issuer, sleeper=lambda _: None)
            self.assertEqual(result, 1)
            issuer.assert_called_once()

    def test_success_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            issuer = Mock(return_value="issued")
            arguments = dict(resolver=lambda: {"169.58.86.108"}, issuer=issuer, verifier=lambda: True)
            self.assertEqual(module.finish(Path(directory), 10, 1, **arguments), 0)
            self.assertEqual(module.finish(Path(directory), 10, 1, **arguments), 0)
            issuer.assert_called_once()


if __name__ == "__main__":
    unittest.main()
