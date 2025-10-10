@echo off
setlocal enabledelayedexpansion

REM SandboxBox Launcher with Claude Auth Transfer (Windows)
REM Usage: launch-sandboxbox.bat [repository-path] [command]

set "REPO_PATH=%~1"
if "%REPO_PATH%"=="" set "REPO_PATH=."

set "COMMAND=%~2"
if "%COMMAND%"=="" set "COMMAND=claude"

echo 🚀 Launching SandboxBox with Claude Code...
echo 📁 Repository: %REPO_PATH%
echo 🔧 Command: %COMMAND%

REM Get absolute path
for %%F in ("%REPO_PATH%") do set "REPO_ABS_PATH=%%~fF"

echo 📍 Absolute path: %REPO_ABS_PATH%

REM Check if it's a git repository
if not exist "%REPO_ABS_PATH%\.git" (
    echo ❌ Error: %REPO_ABS_PATH% is not a git repository
    echo Please ensure the directory contains a .git folder
    exit /b 1
)

REM Collect Anthropic and Claude environment variables
set "ENV_ARGS="
for /f "tokens=1 delims==" %%a in ('set ^| findstr /r "^ANTHROPIC"^=') do (
    set "ENV_ARGS=!ENV_ARGS! -e %%a=!%%a!"
)
for /f "tokens=1 delims==" %%a in ('set ^| findstr /r "^CLAUDE"^=') do (
    set "ENV_ARGS=!ENV_ARGS! -e %%a=!%%a!"
)

echo 🔑 Environment variables transferred

REM Find SandboxBox podman binary
set "PODMAN_PATH="
if exist "bin\podman.exe" (
    set "PODMAN_PATH=bin\podman.exe"
) else (
    where podman >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%i in ('where podman') do set "PODMAN_PATH=%%i"
    )
)

if "%PODMAN_PATH%"=="" (
    echo ❌ Error: Podman binary not found
    echo Please ensure SandboxBox is properly installed
    exit /b 1
)

echo 🐳 Using Podman: %PODMAN_PATH%

REM Build the Podman command with complete Claude session transfer
set "PODMAN_CMD=%PODMAN_PATH% run --rm -it"
set "PODMAN_CMD=%PODMAN_CMD% -v "%REPO_ABS_PATH%:/project""
set "PODMAN_CMD=%PODMAN_CMD% -v "%USERPROFILE%\.ssh:/root/.ssh:ro""
set "PODMAN_CMD=%PODMAN_CMD% -v "%USERPROFILE%\.gitconfig:/root/.gitconfig:ro""
set "PODMAN_CMD=%PODMAN_CMD% -v "%USERPROFILE%\.claude:/root/.claude""
set "PODMAN_CMD=%PODMAN_CMD% %ENV_ARGS%"
set "PODMAN_CMD=%PODMAN_CMD% --env REPO_PATH=/project"
set "PODMAN_CMD=%PODMAN_CMD% --env HOME=/root"
set "PODMAN_CMD=%PODMAN_CMD% sandboxbox-auth:latest"
set "PODMAN_CMD=%PODMAN_CMD% %COMMAND%"

echo 🎯 Running command...
echo.

REM Execute the command
%PODMAN_CMD%