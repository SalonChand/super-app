@echo off
echo ==========================================
echo Starting Super App!
echo ==========================================

echo[1/3] Starting Node.js Backend Server...
start cmd /k "cd backend\server && npm run dev"

echo[2/3] Starting React Frontend...
start cmd /k "cd client && npm run dev"

echo[3/3] Waiting 3 seconds for servers to boot up...
timeout /t 3 /nobreak > NUL

echo Opening Super App in your default browser...
start http://localhost:5173

echo Done! You can close this small launcher window.
pause