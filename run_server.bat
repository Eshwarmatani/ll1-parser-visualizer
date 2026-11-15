@echo off
title LL(1) Visualizer Localhost Server
echo ======================================================================
echo    Starting Localhost HTTP Server on http://localhost:8000 ...
echo ======================================================================
start "" "http://localhost:8000"
python -m http.server 8000
pause

