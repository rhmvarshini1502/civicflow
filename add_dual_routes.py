import os

filepath = r"c:\Users\ASUS\OneDrive\Desktop\someapp\api\app\main.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Restore plain FastAPI without root_path
content = content.replace('app = FastAPI(title=settings.PROJECT_NAME, root_path="/api")', 'app = FastAPI(title=settings.PROJECT_NAME)')

lines = content.split("\n")
new_lines = []
for line in lines:
    new_lines.append(line)
    if line.strip().startswith("@app.") and '"/api/' in line:
        dual_line = line.replace('"/api/', '"/')
        new_lines.append(dual_line)

new_content = "\n".join(new_lines)
with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Successfully updated dual routes in api/app/main.py!")
