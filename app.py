import os, re, sqlite3
from functools import wraps
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import init_db, get_db
from services.analyzer import analyze_message
from services.scenarios import SCENARIOS

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-development-secret")
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
init_db()

def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            flash("Please sign in to access your dashboard.", "warning")
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        if len(name) < 2 or len(name) > 60:
            flash("Name must contain 2–60 characters.", "error")
        elif not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            flash("Enter a valid email address.", "error")
        elif len(password) < 8:
            flash("Password must be at least 8 characters.", "error")
        else:
            try:
                with get_db() as db:
                    cur = db.execute("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",
                                     (name, email, generate_password_hash(password, method="pbkdf2:sha256", salt_length=8)))
                    session["user_id"] = cur.lastrowid
                    session["user_name"] = name
                return redirect(url_for("dashboard"))
            except sqlite3.IntegrityError:
                flash("An account with this email already exists.", "error")
    return render_template("auth.html", mode="register")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        with get_db() as db:
            user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"], session["user_name"] = user["id"], user["name"]
            return redirect(url_for("dashboard"))
        flash("Email or password is incorrect.", "error")
    return render_template("auth.html", mode="login")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.route("/dashboard")
@login_required
def dashboard():
    with get_db() as db:
        stats = db.execute("""SELECT COUNT(*) total,
          COALESCE(SUM(correct),0) correct FROM attempts WHERE user_id=?""",
          (session["user_id"],)).fetchone()
    return render_template("dashboard.html", stats=stats)

@app.route("/simulator")
@login_required
def simulator():
    return render_template("simulator.html", scenarios=SCENARIOS)

@app.route("/api/attempt", methods=["POST"])
@login_required
def save_attempt():
    data = request.get_json(silent=True) or {}
    sid, answer = data.get("scenario_id"), data.get("answer")
    scenario = next((s for s in SCENARIOS if s["id"] == sid), None)
    if not scenario or answer not in ("Phishing", "Suspicious", "Legitimate"):
        return jsonify(error="Invalid scenario or answer."), 400
    correct = int(answer == scenario["answer"])
    with get_db() as db:
        db.execute("INSERT INTO attempts(user_id,scenario_id,answer,correct) VALUES(?,?,?,?)",
                   (session["user_id"], sid, answer, correct))
    return jsonify(correct=bool(correct), expected=scenario["answer"],
                   explanation=scenario["explanation"], safe_action=scenario["safe_action"])

@app.route("/analyzer")
@login_required
def analyzer():
    return render_template("analyzer.html")

@app.route("/api/analyze", methods=["POST"])
@login_required
def api_analyze():
    data = request.get_json(silent=True) or {}
    text = data.get("message", "")
    if not isinstance(text, str) or not text.strip():
        return jsonify(error="Enter a message to analyze."), 400
    if len(text) > 5000:
        return jsonify(error="Message must be 5,000 characters or fewer."), 400
    return jsonify(analyze_message(text.strip()))

@app.route("/api/analyze-url", methods=["POST"])
@login_required
def analyze_url():
    data = request.get_json(silent=True) or {}
    url = str(data.get("url", "")).strip()
    if not url or len(url) > 2048:
        return jsonify(error="Enter a URL up to 2,048 characters."), 400
    from services.analyzer import analyze_url_text
    return jsonify(analyze_url_text(url))

@app.route("/health")
def health():
    return jsonify(status="ok", app="PhishGuard")

@app.errorhandler(413)
def too_large(_):
    return jsonify(error="Request is too large."), 413

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", port=int(os.environ.get("PORT", 5000)))
