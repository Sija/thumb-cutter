global[id] ?= require name for id, name of {
  'Path'  : 'path'
  'fs'
  'crypto'
  'mkdirp'
  'sharp'
}

class ImageResizer
  __requestCache = 
    atWork: {}
    queue : {}

  @convert: (options = {}, callback) ->
    {src, dst, width, height, rotate, quality} = options

    mkdirp.sync Path.dirname(dst)

    pipeline = []
    pipeline.push method: 'rotate',  args: (if rotate is yes then [] else [rotate]) if rotate
    pipeline.push method: 'resize',  args: [width, height] if width or height
    pipeline.push method: 'quality', args: [quality] if quality
    pipeline.push method: 'progressive'  if options.progressive is yes
    pipeline.push method: 'withMetadata' if options.withMetadata is yes

    try
      image = sharp(src)
      image[method] (args || [])... for {method, args} in pipeline

      options.sharpImage? image # TODO:

      image.toFile dst, (err, info) ->
        if err
          callback err
        else
          callback null, dst

    catch err
      callback(err)

  @static: (root, options = {}) ->
    root = Path.normalize root

    options.cacheDir      ?= Path.join root, '.cache'
    options.quality       ?= 80
    options.progressive   ?= yes
    options.rotate        ?= no
    options.withMetadata  ?= no

    send_with_headers = (res, file) ->
      options.setHeaders? res, file
      res.sendFile file

    send_if_exists = (res, file, callback) ->
      return callback() unless fs.existsSync file
      send_with_headers res, file

    return (req, res, next) ->
      # reject funny requests
      return next() unless req.method in ['GET', 'HEAD']

      # we need req.params[0] when used with * capture groups
      file = decodeURI req.params[0] or req.path
      orig = Path.normalize Path.join root, file

      # bailout if file is not an image
      unless file.match /\.(jpe?g|png|webp|tiff)$/i
        return send_if_exists res, orig, next

      # bailout if file doesn't exists
      return next() unless fs.existsSync orig

      {dim, rotate, quality} = req.params
      dim     ||= req.query.dim
      rotate  ||= req.query.rotate
      quality ||= req.query.quality

      # parameters validation plz
      dim     = null if dim      and not /^(\d+)?x(\d+)?$/.exec dim
      rotate  = null if rotate   and not /^(\d+|true|false)$/.exec rotate
      quality = null if quality  and not /^(\d+)$/.exec quality

      # no parameters found, returning original file
      unless dim? or rotate? or quality?
        return send_if_exists res, orig, next

      dim     ||= options.dim
      rotate  ||= options.rotate
      quality ||= options.quality

      cacheKey = "#{dim || 'original'}/r_#{rotate}-q_#{quality}"
      # cacheKey = crypto.createHash('md5').update(cacheKey).digest('hex')
      dst = Path.join options.cacheDir, cacheKey, file

      processRequest = ->
        # send image if found or generate it on the fly
        send_if_exists res, dst, ->
          # mark image conversion start
          __requestCache.atWork[dst] = yes

          dims = "#{dim}".split /x/
          opts =
            src     : orig
            dst     : dst
            width   : Number(dims[0]) or null
            height  : Number(dims[1]) or null
            quality : Number(quality) or null
            rotate  : switch rotate
              when 'true',  true  then yes
              when 'false', false then no
              else
                Number(rotate) or null
            progressive : options.progressive
            withMetadata: options.withMetadata

          ImageResizer.convert opts, (err, dst) ->
            # console.log 'ImageResizer.convert', err, dst, __requestCache
            unless err
              send_with_headers res, dst
            else
              next err if err

            # execute pending requests
            if queue = __requestCache.queue[dst]
              callback() for callback in queue

            delete __requestCache.atWork[dst]
            delete __requestCache.queue[dst]

      process.nextTick -> 
        if __requestCache.atWork[dst]
          # queue request until image conversion finishes
          __requestCache.queue[dst] ||= []
          __requestCache.queue[dst].push processRequest
        else
          # go ahead, no conversion in progress
          processRequest()

module.exports = ImageResizer
