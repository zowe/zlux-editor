@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.

set NODE_PATH=.;.\node_modules
cd %SRC_DIR%
mkdir %SRC_DIR%\..\zlux-app-manager
robocopy %PREFIX%\lib\zowe\zlux\zlux-app-manager %SRC_DIR%\..\zlux-app-manager /E > nul
mkdir %SRC_DIR%\..\zlux-platform
robocopy %PREFIX%\lib\zowe\zlux\zlux-platform %SRC_DIR%\..\zlux-app-manager /E > nul

REM absolute nonsense to work around windows utility path limitations.
REM rd and del have issues with long paths
if not exist %SRC_DIR%\temp_nonsense mkdir %SRC_DIR%\temp_nonsense

if exist "nodeServer" (
  cd nodeServer
  CALL npm install
  CALL npm run build
  cd ..
  robocopy %SRC_DIR%\temp_nonsense %SRC_DIR%\nodeServer /purge > nul
  rmdir %SRC_DIR%\nodeServer
)
if exist "webClient" (
  cd webClient
  CALL npm install
  setlocal
  set MVD_DESKTOP_DIR=%SRC_DIR%\zlux-app-manager\virtual-desktop
  CALL npm run build
  CALL npm run i18n
  cd ..
  robocopy %SRC_DIR%\temp_nonsense %SRC_DIR%\webClient /purge > nul
  rmdir %SRC_DIR%\webClient
  endlocal
)

if exist ".git" (
  robocopy %SRC_DIR%\temp_nonsense %SRC_DIR%\.git /purge > nul
  rmdir %SRC_DIR%\.git
)

robocopy %SRC_DIR%\temp_nonsense %SRC_DIR%\build /purge > nul
rmdir build
del /F /S /Q "sonar-project.properties"
del /F /S /Q *.ppf
del /F /S /Q .gitignore .gitattributes .gitmodules
del /F /S /Q .npm*
del /F /S /Q Jenkinsfile
del /F /S /Q settings.gradle
rd /S /Q __pycache__

del /F /S /Q build_env_setup.bat  conda_build.bat  metadata_conda_debug.yaml setup.py

if not exist %PREFIX%/lib/zowe/zlux/zlux-app-server/defaults/plugins mkdir %PREFIX%/lib/zowe/zlux/zlux-app-server/defaults/plugins
echo '{"identifier":"%PKG_NAME%","pluginLocation":"%PREFIX%/lib/zowe/apps/%PKG_NAME%/%PKG_VERSION%"}' ^
     > %PREFIX%/lib/zowe/zlux/zlux-app-server/defaults/plugins/%PKG_NAME%.json

if not exist %PREFIX%\lib\zowe\apps\%PKG_NAME%\%PKG_VERSION% mkdir %PREFIX%\lib\zowe\apps\%PKG_NAME%\%PKG_VERSION%
robocopy %SRC_DIR% %PREFIX%\lib\zowe\apps\%PKG_NAME%\%PKG_VERSION% * /E > nul
rd /S /Q %SRC_DIR%\temp_nonsense
exit 0

