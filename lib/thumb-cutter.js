var ImageResizer, id, name, ref;

ref = {
  'Path': 'path',
  'fs': 'fs',
  'crypto': 'crypto',
  'mkdirp': 'mkdirp',
  'sharp': 'sharp'
};
for (id in ref) {
  name = ref[id];
  if (global[id] == null) {
    global[id] = require(name);
  }
}

ImageResizer = (function() {
  var __requestCache;

  function ImageResizer() {}

  __requestCache = {
    atWork: {},
    queue: {}
  };

  ImageResizer.convert = function(options, callback) {
    var args, dst, err, height, i, image, len, method, pipeline, quality, ref1, rotate, src, width;
    if (options == null) {
      options = {};
    }
    src = options.src, dst = options.dst, width = options.width, height = options.height, rotate = options.rotate, quality = options.quality;
    mkdirp.sync(Path.dirname(dst));
    pipeline = [];
    if (rotate) {
      pipeline.push({
        method: 'rotate',
        args: (rotate === true ? [] : [rotate])
      });
    }
    if (width || height) {
      pipeline.push({
        method: 'resize',
        args: [width, height]
      });
    }
    if (quality) {
      pipeline.push({
        method: 'quality',
        args: [quality]
      });
    }
    if (options.progressive === true) {
      pipeline.push({
        method: 'progressive'
      });
    }
    if (options.withMetadata === true) {
      pipeline.push({
        method: 'withMetadata'
      });
    }
    try {
      image = sharp(src);
      for (i = 0, len = pipeline.length; i < len; i++) {
        ref1 = pipeline[i], method = ref1.method, args = ref1.args;
        image[method].apply(image, args || []);
      }
      if (typeof options.sharpImage === "function") {
        options.sharpImage(image);
      }
      return image.toFile(dst, function(err, info) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, dst);
        }
      });
    } catch (_error) {
      err = _error;
      return callback(err);
    }
  };

  ImageResizer["static"] = function(root, options) {
    var send_if_exists, send_with_headers;
    if (options == null) {
      options = {};
    }
    root = Path.normalize(root);
    if (options.cacheDir == null) {
      options.cacheDir = Path.join(root, '.cache');
    }
    if (options.quality == null) {
      options.quality = 80;
    }
    if (options.progressive == null) {
      options.progressive = true;
    }
    if (options.rotate == null) {
      options.rotate = false;
    }
    if (options.withMetadata == null) {
      options.withMetadata = false;
    }
    send_with_headers = function(res, file) {
      if (typeof options.setHeaders === "function") {
        options.setHeaders(res, file);
      }
      return res.sendFile(file);
    };
    send_if_exists = function(res, file, callback) {
      if (!fs.existsSync(file)) {
        return callback();
      }
      return send_with_headers(res, file);
    };
    return function(req, res, next) {
      var cacheKey, dim, dst, file, orig, processRequest, quality, ref1, ref2, rotate;
      if ((ref1 = req.method) !== 'GET' && ref1 !== 'HEAD') {
        return next();
      }
      file = decodeURI(req.params[0] || req.path);
      orig = Path.normalize(Path.join(root, file));
      if (!file.match(/\.(jpe?g|png|webp|tiff)$/i)) {
        return send_if_exists(res, orig, next);
      }
      if (!fs.existsSync(orig)) {
        return next();
      }
      ref2 = req.params, dim = ref2.dim, rotate = ref2.rotate, quality = ref2.quality;
      dim || (dim = req.query.dim);
      rotate || (rotate = req.query.rotate);
      quality || (quality = req.query.quality);
      if (dim && !/^(\d+)?x(\d+)?$/.exec(dim)) {
        dim = null;
      }
      if (rotate && !/^(\d+|true|false)$/.exec(rotate)) {
        rotate = null;
      }
      if (quality && !/^(\d+)$/.exec(quality)) {
        quality = null;
      }
      if (!((dim != null) || (rotate != null) || (quality != null))) {
        return send_if_exists(res, orig, next);
      }
      dim || (dim = options.dim);
      rotate || (rotate = options.rotate);
      quality || (quality = options.quality);
      cacheKey = (dim || 'original') + "/r_" + rotate + "-q_" + quality;
      dst = Path.join(options.cacheDir, cacheKey, file);
      processRequest = function() {
        return send_if_exists(res, dst, function() {
          var dims, opts;
          __requestCache.atWork[dst] = true;
          dims = ("" + dim).split(/x/);
          opts = {
            src: orig,
            dst: dst,
            width: Number(dims[0]) || null,
            height: Number(dims[1]) || null,
            quality: Number(quality) || null,
            rotate: (function() {
              switch (rotate) {
                case 'true':
                case true:
                  return true;
                case 'false':
                case false:
                  return false;
                default:
                  return Number(rotate) || null;
              }
            })(),
            progressive: options.progressive,
            withMetadata: options.withMetadata
          };
          return ImageResizer.convert(opts, function(err, dst) {
            var callback, i, len, queue;
            if (!err) {
              send_with_headers(res, dst);
            } else {
              if (err) {
                next(err);
              }
            }
            if (queue = __requestCache.queue[dst]) {
              for (i = 0, len = queue.length; i < len; i++) {
                callback = queue[i];
                callback();
              }
            }
            delete __requestCache.atWork[dst];
            return delete __requestCache.queue[dst];
          });
        });
      };
      return process.nextTick(function() {
        var base;
        if (__requestCache.atWork[dst]) {
          (base = __requestCache.queue)[dst] || (base[dst] = []);
          return __requestCache.queue[dst].push(processRequest);
        } else {
          return processRequest();
        }
      });
    };
  };

  return ImageResizer;

})();

module.exports = ImageResizer;
