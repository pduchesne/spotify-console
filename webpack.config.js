const HtmlWebPackPlugin = require("html-webpack-plugin");

var path = require("path");

// this will create index.html file containing script
// source in dist folder dynamically
const htmlPlugin = new HtmlWebPackPlugin({
  template: "./src/index.html",
  filename: "./index.html"
});

module.exports = {
  //specify the entry point for your project
  entry: "./src/index.tsx",
  // specify the output file name
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    publicPath: "/"
  },
  resolve: {
    // this is required to be able to do non relative imports of src code
    modules: [path.resolve('./src'), path.resolve('./node_modules')],
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js']
},
  devtool: "source-map",
  module: {
    // consists the transform configuration
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader"
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  // this will create a development server to host our application
  // and will also provide live reload functionality
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 3000,
    // needed to properly support BrowsrRouter
    // see https://stackoverflow.com/questions/43209666/react-router-v4-cannot-get-url
    historyApiFallback: true
  },

  // this will watch the bundle for any changes
  watch: true,
  // specify the plugins which you are using
  plugins: [htmlPlugin]
};
