@echo off
echo Starting Match-2 Level and Template Re-generation...
echo.
echo [1/3] Extracting templates from competitor levels...
node Extract-BoardTemplates.js
echo.
echo [2/3] Exporting templates and level rules to Excel...
node Export-ToExcel.js
echo.
echo [3/4] Generating visualizer HTML page...
node Generate-Visualizer.js
echo.
echo [4/4] Generating level config preview page...
node Generate-LevelPreview.js
echo.
echo Done! Re-generation process completed successfully.
pause
