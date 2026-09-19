import os, tempfile, unittest
from app import app
from database.db import init_db

class PhishGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False)
        self.tmp.close()
        os.environ["DATABASE_PATH"] = self.tmp.name
        # Reinitialize schema at test database path
        import database.db as dbmod
        dbmod.DB_PATH = self.tmp.name
        dbmod.init_db()
        app.config["TESTING"] = True
        self.client = app.test_client()
    def tearDown(self):
        try: os.unlink(self.tmp.name)
        except OSError: pass
    def test_home(self):
        self.assertEqual(self.client.get("/").status_code, 200)
    def test_health(self):
        self.assertEqual(self.client.get("/health").json["status"], "ok")
    def test_register_and_dashboard(self):
        r=self.client.post("/register",data={"name":"Demo User","email":"demo@example.com","password":"safe-pass-123"},follow_redirects=True)
        self.assertEqual(r.status_code,200)
        self.assertIn(b"Welcome back",r.data)
    def test_analyzer_requires_login(self):
        r=self.client.post("/api/analyze",json={"message":"urgent verify password"})
        self.assertEqual(r.status_code,302)

if __name__ == "__main__": unittest.main()
