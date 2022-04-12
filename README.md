This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.
# ZLUX Editor

This is a Monaco-powered editor of remote files and datasets that are accessible on a system with a Zowe instance, and this program is an App which lives within that Zowe instance.

**To request features or report bugs, please use the issues page at the [zlux repo](https://github.com/zowe/zlux/issues) with the editor or app tags**

## Building

This repo uses the zlux angular file tree component, which is hosted on Zowe's artifactory.
To install that as a prereq, you must first do:

`npm config set @zowe:registry https://zowe.jfrog.io/zowe/api/npm/npm-release/`

Afterwards, read this wiki on building: https://docs.zowe.org/stable/extend/extend-desktop/mvd-buildingplugins/

## Installing

Read this wiki on installing: https://github.com/zowe/zlux/wiki/Installing-Plugins
