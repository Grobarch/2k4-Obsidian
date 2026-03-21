@echo off
REM This script creates the templates directory and files
echo Creating templates directory...
if not exist "F:\RPG\RPG_repo\2k4-Obsidian\vault\templates" (
    mkdir "F:\RPG\RPG_repo\2k4-Obsidian\vault\templates"
    echo Directory created successfully
) else (
    echo Directory already exists
)

echo.
echo Running Python script to create template files...
cd /d "F:\RPG\RPG_repo\2k4-Obsidian"
python create_templates.py

echo.
echo.
echo Listing created templates...
echo.
dir "F:\RPG\RPG_repo\2k4-Obsidian\vault\templates" /B

echo.
pause
