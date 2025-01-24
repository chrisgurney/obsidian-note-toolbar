@ECHO OFF
CHCP 1251
SETLOCAL
SET obsidian=D:\Obsidian
SET ntb=.obsidian\plugins\note-toolbar

SET newscript=%obsidian%\NewScript\%ntb%
SET devvault=%obsidian%\dev-vault\%ntb%
SET dataview=%obsidian%\Dataview\%ntb%
SET cv=%onedrive%\Apps\Obsidian\CV\%ntb%
SET wine=%onedrive%\Apps\Obsidian\Wine\%ntb%

CALL :copyNTB %newscript%
CALL :copyNTB %devvault%
CALL :copyNTB %dataview%
CALL :copyNTB %cv%
CALL :copyNTB %wine%
ECHO.All copied!

:copyNTB
COPY main.js %~1 /y
COPY style.css %~1 /y
COPY manifest-beta.json %~1\manifest.json /y
ECHO.Done: %~1
GOTO:EOF
