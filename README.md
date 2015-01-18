# Thumb Cutter

Thumb Cutter slices your images with blazing speed (with the help of [sharp](https://github.com/lovell/sharp) library)! It comes as express.js middleware, so you can just plug it in and start using by adding query parameters onto a standard image url. It's ideal for web developers who would like to easily experiment with different thumbnail sizes generated on the go.

You can throw at it JPEG, PNG and WebP images. Colour spaces, embedded ICC profiles and alpha transparency channels are all handled correctly.

Since Thumb Cutter is using [libvips image processing library](https://github.com/jcupitt/libvips) we're in for some benefits straight from Birkbeck College!

Quoting from sharp's README:

> Only small regions of uncompressed image data are held in memory and processed at a time, taking full advantage of multiple CPU cores and L1/L2/L3 cache. Resizing an image is typically 4x faster than using the quickest ImageMagick and GraphicsMagick settings.

> Huffman tables are optimised when generating JPEG output images without having to use separate command line tools like jpegoptim and jpegtran. PNG filtering can be disabled, which for diagrams and line art often produces the same result as pngcrush.

> Everything remains non-blocking thanks to libuv, no child processes are spawned and Promises/A+ are supported.

## Usage

```js
var express = require('express'),
    app = express(),
    thumbCutter = require('thumb-cutter');

app.use('/pictures', thumbCutter.static(__dirname + '/../pictures'));
```

```html
<img src="/pictures/bw/photo.jpg?dim=200x100&amp;rotate=true" alt="" />
```

## Install

    npm install thumb-cutter

`libvips` is required for this module, so make sure it is installed.

Debian

    apt-get install libvips libvips-dev libgsf-1-dev

Mac OS X

    brew install vips

## Documentation

### thumbCutter.static(path, [options])

Middleware to replace `express.static()` or `connect.static()`.

`path` is the base directory where images are located.

`options` is an object to specify customizations. It currently has the following options:

* `cacheDir` The directory where generated images will be created. (default: `[path]/.cache/`)
* `quality` The output quality to use for lossy JPEG, WebP and TIFF output formats. (default: `80`)
* `rotate` Rotate the output image by either an explicit angle or auto-orient based on the EXIF Orientation tag. (default: `false`)
* `progressive` Use progressive (interlace) scan for JPEG and PNG output. (default: `true`)
* `withMetadata` Include all metadata (EXIF, XMP, IPTC) from the input image in the output image. This will also convert to and add the latest web-friendly v2 sRGB ICC profile. (default: `false`)
* `setHeaders` Callback with signature `function(err, destFilepath)`

Resizing of images is directed by the query parameter `dim`.  This is in the format [width]x[height]. E.g. `red.gif?dim=200x100`

Resized images will be created on an as needed basis, and stored in `cacheDir`.

If there is no parameters present, the original image will be served.

### thumbCutter.convert(options, callback)

The first argument is an options object. callback argument is required.

* `src` (required) Path to source image
* `dst` (required) Path to destination image
* `width` Width of resized image
* `height` Height of resized image
* `quality` The output quality to use for lossy JPEG, WebP and TIFF output formats.
* `rotate` Rotate the output image by either an explicit angle or auto-orient based on the EXIF Orientation tag.
* `progressive` Use progressive (interlace) scan for JPEG and PNG output.
* `withMetadata` Include all metadata (EXIF, XMP, IPTC) from the input image in the output image. This will also convert to and add the latest web-friendly v2 sRGB ICC profile.

The callback argument gets 2 arguments. The first is an error object, most likely from sharp. The second argument is the path to the created image.
