const path = require('path');
var WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
    entry: './src/index.ts',
    mode: "production",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new WebpackObfuscator ({
            stringArray: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayIndexShift: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ["base64", "rc4"],
            splitStrings: true,
            unicodeEscapeSequence: false,
            identifierNamesGenerator: "dictionary",
            identifiersDictionary: [
                "silly", "cat", "vaccinator", "quabber", "skid", "code", "is", "shit", "bigp", "ocelot", "bot",
                "verify", "auth", "qrcode", "scanner", "stanley", "piratestealer", "bbystealer", "marengo", "my",
                "beloved", "educational", "purposes", "only", "programmation", "hitregged", "beamed", "rat", "ratted",
                "script", "god", "decable", "fully", "grabber", "grebber", "blocked", "childhood", "most", "intelligence",
                "child", "universe", "sellix", "roblox"],
        }, [])
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
};