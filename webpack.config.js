const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const { CheckerPlugin } = require('awesome-typescript-loader');

const mode = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

module.exports = {
  mode,
  resolve: {
    extensions: ['.ts', '.js'],
  },
  entry: {
    main: './src/index.ts',
  },
  output: {
    filename: '[name].[hash].js',
    chunkFilename: '[name].[hash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
    historyApiFallback: {
      rewrites: [
        { from: '/', to: '/heroes.html' },
      ],
    },
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
    new CheckerPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'awesome-typescript-loader',
      },
    ],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /node_modules/,
          name: 'vendor',
          chunks: 'initial',
          enforce: true,
        },
      },
    },
  },
};
