@echo off
echo Aktualizacja tabelek systemow i scenariuszy...
node scripts\update-episode-tables.mjs vault\systemy
node scripts\update-episode-tables.mjs vault\scenariusze

echo Startowanie serwera Quartz...
cd quartz
npx quartz build --serve -d ../vault
