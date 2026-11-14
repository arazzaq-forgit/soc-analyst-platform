"""Dev helper: promote one user to admin in the LOCAL dev database."""
import sqlite3
import sys

if len(sys.argv) != 2:
    print("Usage: python scripts\\make_admin.py user@example.com")
    raise SystemExit(1)

email = sys.argv[1].strip()
conn = sqlite3.connect("dev.db")
cur = conn.cursor()

print("Users now:", cur.execute("SELECT id, email, role FROM users").fetchall())

sample = cur.execute("SELECT role FROM users WHERE role IS NOT NULL LIMIT 1").fetchone()
upper = bool(sample) and str(sample[0]).isupper()
value = "ADMIN" if upper else "admin"
print("Roles are stored as", "UPPERCASE names" if upper else "lowercase values")

cur.execute("UPDATE users SET role = ? WHERE email = ?", (value, email))
conn.commit()
print("Rows updated:", cur.rowcount)
if cur.rowcount == 0:
    print("No user with that email. Check the list above.")
conn.close()
