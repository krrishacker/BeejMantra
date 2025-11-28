# How to Start Both Services

## Two Services Needed:

1. **ML Service (Python)** - Port 5001
2. **Node.js Backend** - Port 5000

## Start ML Service First

**Terminal 1:**
```powershell
cd backend\ml_service
.\start_ml_service.ps1
```

Wait for: `Starting ML service on http://localhost:5001`

## Start Node.js Backend

**Terminal 2 (NEW terminal):**
```powershell
cd backend
npm start
```

## If Port 5000 is Already in Use

### Option 1: Kill the Process
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Option 2: Use Task Manager
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "node.exe" process
3. End Task

### Option 3: Restart Computer
(Last resort)

## Quick Commands

**Terminal 1 - ML Service:**
```powershell
cd C:\Users\uday1\OneDrive\Desktop\farmer\farmarMAin\backend\ml_service
.\start_ml_service.ps1
```

**Terminal 2 - Node.js Backend:**
```powershell
cd C:\Users\uday1\OneDrive\Desktop\farmer\farmarMAin\backend
npm start
```

## Verify Both Are Running

**Check ML Service:**
```powershell
curl http://localhost:5001/health
```

**Check Node.js Backend:**
```powershell
curl http://localhost:5000/api/health
```

Both should return `{"status":"OK"...}`

