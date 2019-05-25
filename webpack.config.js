const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');

const config = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: {
    main: './src/index.ts',
  },
  output: {
    filename: '[name].[hash].js',
    chunkFilename: '[name].[hash].js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    contentBase: './dist',
    historyApiFallback: {
      rewrites: [
        { from: '/', to: '/heroes.html' },
      ]
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      hash: true,
      template: './src/index.html',
      filename: 'heroes.html',
    }),
    new CleanWebpackPlugin(['dist'], {
      verbose: false,
      exclude: ['src'],
    }),
    new CheckerPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'awesome-typescript-loader'
      }
    ]
  },
  optimization: {
    splitChunks: {
        cacheGroups: {
          vendor: {
                test: /node_modules/,
                name: 'vendor',
                chunks: 'initial',
                enforce: true
            }
        }
    },
    minimizer: [new TerserPlugin()],
  }
};

module.exports = (env, argv) => {

  if (argv.mode === 'production') {
    config.mode = 'production';
  } else {
    config.mode = 'development';
    config.devtool = 'eval';
  }

  return config;
};
