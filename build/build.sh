#!/bin/bash

# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

export NODE_PATH=.:./node_modules
cd ${SRC_DIR}
cp -r ${PREFIX}/lib/zowe/zlux/zlux-app-manager ../
cp -r ${PREFIX}/lib/zowe/zlux/zlux-platform ../
if [ -d "./nodeServer" ]
then
    cd nodeServer
    npm install
    npm run build
    cd ..
fi

if [ -d "./webClient" ]
then
    cd webClient
    npm install
    MVD_DESKTOP_DIR=${PREFIX}/lib/zowe/zlux/zlux-app-manager/virtual-desktop npm run build
    MVD_DESKTOP_DIR=${PREFIX}/lib/zowe/zlux/zlux-app-manager/virtual-desktop npm run i18n && 0
    cd ..
fi

rm -rf webClient nodeServer dco-signoffs
rm -rf .git* */.git* */*/.git* */*/*/.git*
rm -rf .editor* .angular*
rm -f sonar-project.properties
rm -rf ../zlux-app-manager
rm -rf ../zlux-platform
mkdir -p $PREFIX/lib/zowe/apps/$PKG_NAME/$PKG_VERSION
cp -r . $PREFIX/lib/zowe/apps/$PKG_NAME/$PKG_VERSION
cd $PREFIX/lib/zowe/apps/$PKG_NAME/$PKG_VERSION
rm -rf __pycache__  build_env_setup.sh  conda_build.sh  metadata_conda_debug.yaml setup.py build
mkdir -p $PREFIX/lib/zowe/zlux/zlux-app-server/defaults/plugins
echo "{\"identifier\":\"${PKG_NAME}\",\"pluginLocation\":\"${PREFIX}/lib/zowe/apps/${PKG_NAME}/${PKG_VERSION}\"}" \
     > $PREFIX/lib/zowe/zlux/zlux-app-server/defaults/plugins/${PKG_NAME}.json
exit 0

