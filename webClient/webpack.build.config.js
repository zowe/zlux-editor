
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

var path = require('path');
var webpackConfig = require('webpack-config');
var CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}
const pubPath = "/ZLUX/plugins/org.zowe.editor/web/";
process.env.ASSET_PATH=pubPath;

var config = {
  'entry': {
    'main': path.resolve(__dirname, './src/plugin.ts'),
  },
  'output': {
    'path': path.resolve(__dirname, '../web'),
    'filename': '[name].js',
    publicPath: pubPath
  },
  'module': {
    'rules': [{
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
      {
        test: /\.scss$/,
        'use': [
          'exports-loader?module.exports.toString()',
          {
            'loader': 'css-loader',
            'options': {
              'sourceMap': false
            }
          },
          {
            'loader': 'sass-loader',
            'options': {
              'implementation': require('sass')
            }
          }
        ]
      },  {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ],
  },
  "node": {
    "net": "empty"
  },
  'plugins': [
    new CopyWebpackPlugin([{
        from: path.resolve(__dirname, './src/assets'),
        to: path.resolve('../web/assets')
      },
      {
        from: path.resolve(__dirname, './src/mock'),
        to: path.resolve('../web/mock')
      }
    ]),
    new CompressionPlugin({
      threshold: 100000,
      minRatio: 0.8
    })
    , new MonacoWebpackPlugin({publicPath: pubPath})
  ]
};


module.exports = new webpackConfig.Config()
  .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack.base.js'))
  .merge(config);

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
