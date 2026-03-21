@echo off
REM Create the templates directory
if not exist "F:\RPG\RPG_repo\2k4-Obsidian\vault\templates" (
    mkdir "F:\RPG\RPG_repo\2k4-Obsidian\vault\templates"
    echo Directory created
)

REM Run the Python script
cd /d "F:\RPG\RPG_repo\2k4-Obsidian"
python create_templates.py

pause
