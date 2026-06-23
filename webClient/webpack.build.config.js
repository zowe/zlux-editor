
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const path = require('path');
const webpack = require("webpack");
const webpackConfig = require('webpack-config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const AotPlugin = require('@ngtools/webpack').AngularWebpackPlugin;

if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

const pubPath = "../../../plugins/org.zowe.editor/web/v3/";
process.env.ASSET_PATH = pubPath;

// Post-build cleanup: consolidates per-chunk .js.LICENSE.txt files into a
// single THIRD_PARTY_LICENSES.txt, and removes uncompressed files that have
// a .gz equivalent (since the server serves pre-compressed assets).
// Both run via compiler.hooks.done (after all files are written to disk)
// to avoid webpack asset-pipeline conflict errors.
class PostBuildCleanupPlugin {
  apply(compiler) {
    const fs = require('fs');
    compiler.hooks.done.tapAsync('PostBuildCleanupPlugin', (stats, callback) => {
      const outDir = compiler.options.output.path;
      let files;
      try {
        files = fs.readdirSync(outDir);
      } catch (e) {
        callback(e);
        return;
      }

      // Consolidate .js.LICENSE.txt files into one THIRD_PARTY_LICENSES.txt
      const licenseFiles = files.filter(f => f.endsWith('.LICENSE.txt')).sort();
      if (licenseFiles.length > 0) {
        const seen = new Set();
        const parts = [];
        for (const file of licenseFiles) {
          const content = fs.readFileSync(path.join(outDir, file), 'utf8');
          if (!seen.has(content)) {
            seen.add(content);
            parts.push(content);
          }
          fs.unlinkSync(path.join(outDir, file));
        }
        fs.writeFileSync(
          path.join(outDir, 'ATTRIBUTION.txt'),
          parts.join('\n\n')
        );
      }

      // Remove uncompressed files that have a .gz equivalent
      const gzNames = new Set(
        files.filter(f => f.endsWith('.gz')).map(f => f.slice(0, -3))
      );
      for (const file of files) {
        if (gzNames.has(file)) {
          fs.unlinkSync(path.join(outDir, file));
        }
      }

      callback();
    });
  }
}

const config = {
  entry: {
    main: path.resolve(__dirname, './src/plugin.ts'),
  },
  output: {
    path: path.resolve(__dirname, '../web/v3'),
    filename: '[name].js',
    publicPath: pubPath
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './node_modules/'),
      'zlux-angular-file-tree':
        path.resolve(__dirname, './node_modules/@zowe/zlux-angular-file-tree')
    },
    fallback: {
      "path": false,
      "os": false,
      "crypto": false,
      "stream": false,
      "vm": false,
      "net": false
    }
  },
  module: {
    rules: [
      {
        test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
        use: ['@ngtools/webpack']
      },
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
      {
        test: /\.scss/,
        use: [
          'raw-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass')
            }
          }
        ]
      },             
      {
        test: [/\.js?$/, /\.ts?$/, /\.jsx?$/, /\.tsx?$/],
        enforce: 'pre',
        exclude: /node_modules/,
        use: ['source-map-loader'],
      }
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './node_modules/monaco-editor/min/vs/base'),
          to: path.resolve('../web/v3/assets/monaco/base')
        },
        {
          from: path.resolve(__dirname, './src/assets'),
          to: path.resolve('../web/v3/assets')
        }
      ]
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new CompressionPlugin({
      threshold: 500000,
      minRatio: 0.8,
      deleteOriginalAssets: true
    }),
    new MonacoWebpackPlugin({ publicPath: pubPath }),
    new AotPlugin({
      tsConfigPath: './tsconfig.json',
      entryModule: './webClient/src/app/app.module.ts#AppModule'
    })
  ]
};

module.exports = new webpackConfig.Config()
  .extend(path.resolve(process.env.MVD_DESKTOP_DIR, 'plugin-config/webpack5.base.js'))
  .merge(config);

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
