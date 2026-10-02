"use strict";
// appdmg calls sizeOf(path, callback), the API of image-size 0.7. The patched release is
// image-size 2, which takes the file's bytes, so this reads the file and hands them over.
const { readFile, readFileSync } = require("node:fs");
const { imageSize } = require("image-size-patched");

module.exports = function sizeOf(path, callback) {
  if (typeof callback !== "function") return imageSize(readFileSync(path));
  readFile(path, (error, bytes) => {
    if (error) return callback(error);
    let size;
    try {
      size = imageSize(bytes);
    } catch (thrown) {
      return callback(thrown);
    }
    return callback(null, size);
  });
};
