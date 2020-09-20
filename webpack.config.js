const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: [
    './src/renderer/draw.js',
    './src/renderer/drawUI.js',
    './src/renderer/layer.js',
    './src/renderer/bakeLayer.js',
    './src/renderer/primitives.js',
    './src/renderer/vert.js',
    './src/renderer/frags.js',

    './src/store/actions.js',
    './src/store/reducers.js',



    './src/index.js',
    './src/components/Root.js',
    './src/components/FloatingMenu.js',
    './src/components/ContextMenu.js',
    './src/components/LeftToolBar.js',

  ],
  output: {
    path: path.resolve(__dirname, 'bin'),
    publicPath: 'bin/',
    filename: 'app.js'
  },
  // devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
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
          'style-loader',
          'css-loader'
          // {
          //   loader: "style-loader"
          // },
          // {
          //   loader: "css-loader",
          //   options: {
          //     modules: true,
          //     importLoaders: 1,
          //   }
          // }
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