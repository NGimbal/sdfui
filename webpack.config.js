const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: [
    './src/actions.js',
    './src/bakeLayer.js',
    './src/ghostUI.js',
    './src/index.js',
    './src/app.js',
    './src/layer.js',
    './src/primitives.js',
    './src/reducers.js',
    './src/sdfui.css',
    './src/tooltip.css',
    './src/ui-mode-stack.css',
    './src/uihints.js',
    './src/vert.js',
    './src/frags.js',
    './src/redux.js',
    // './src/firebaseConfig.js',
  ],
  output: {
    path: __dirname,
    publicPath: '/',
    filename: 'bundle.js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      // {
      //   test: /\.js$/,
      //   exclude: /node_modules/,
      //   use: {
      //     loader: "script-loader",
      //     options: {
      //       sourceMap: true,
      //       useStrict: true,
      //     }
      //   }
      // },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              modules: true,
              importLoaders: 1,
            }
          }
        ]
      }
    ]
  },
  resolve: {
    enforceExtension: false,
    enforceModuleExtension: false,
    extensions: ['.wasm', '.mjs', '.js', '.json'],
    mainFields: ['browser', 'module', 'main'],
    modules: ['node_modules'],
  },
};