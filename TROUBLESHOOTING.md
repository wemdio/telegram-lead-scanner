# Telegram Lead Scanner - Troubleshooting Guide

## EXE File Won't Open

### ✅ What's Already Included
- **Node.js is NOT required** - everything is bundled in the EXE
- **All dependencies included** - fully standalone application
- **No additional installations needed**

### 🔧 Quick Fixes

#### 1. Antivirus Blocking
- Add the app folder to antivirus exclusions
- Temporarily disable antivirus and test

#### 2. Windows Defender SmartScreen
- Click "More info" → "Run anyway"
- Or: Right-click EXE → Properties → Unblock

#### 3. Missing System Libraries
Install Microsoft Visual C++ Redistributable 2015-2022 (x64)

#### 4. Run as Administrator
- Right-click EXE → "Run as administrator"

### 🔍 Diagnosis

#### Command Line Test
```cmd
cd "path\to\Telegram Lead Scanner-win32-x64"
"Telegram Lead Scanner.exe"
```

#### Check File Integrity
- Ensure all files are present (~150-200 MB total)
- Verify `resources` folder exists
- Check for `.dll` and `.pak` files

### 📋 Requirements
- Windows 10/11 (64-bit)
- 4 GB RAM minimum
- 200 MB free space

### 🆘 Still Not Working?

1. Check Windows Event Viewer for errors
2. Try compatibility mode (Windows 10)
3. Move to path without special characters
4. Create a batch file to see error messages:

```batch
@echo off
"Telegram Lead Scanner.exe"
pause
```

**The application is completely self-contained - no external dependencies required!**