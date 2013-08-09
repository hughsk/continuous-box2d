var box2d = require('box2dweb-commonjs')
var greedy = require('greedy-mesher')
var morton = require('morton-page')

module.exports = continuousBox2d

function continuousBox2d(Box2D) {
  return function box2dwrapper(world, field, options) {
    options = options || {}

    var store = morton(field.dims, 4, null, 'position')
    var datafn = options.data || identity
    var xscale = options.xscale || 1
    var yscale = options.yscale || 1

    var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    var b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    var b2BodyDef = Box2D.Dynamics.b2BodyDef
    var b2Body = Box2D.Dynamics.b2Body
    var b2Vec2 = Box2D.Common.Math.b2Vec2

    var mesher = greedy({
      order: [0, 1],
      extraArgs: 1,
      skip: function(value) {
        return value
      },
      append: function(lox, loy, hix, hiy, val, result) {
        result.push([
            lox, loy
          , hix, hiy
          , val
        ])
      }
    })

    if (field.dims !== 2) {
      throw new Error([
          'It looks like your continuous ndarray isn\'t 2D!'
        , 'continuous-box2d only works in 2D.'
      ].join(' '))
    }

    field.on('created', function(chunk) {
      var quads = []
      mesher(chunk, quads)

      var i = quads.length
      while (i--) {
        quads[i] = createStaticQuad(quads[i], chunk)
      }

      if (!store.get(chunk.position[0], chunk.position[1])) store.add({
          position: chunk.position
        , quads: quads
      })
    })

    field.on('removed', function(chunk) {
      var stored = store.get(chunk.position[0], chunk.position[1])
      if (stored) {
        store.remove(chunk.position[0], chunk.position[1])

        var quads = stored.quads
        var i = quads.length
        while (i--) world.DestroyBody(quads[i])
        quads.length = 0
      }
    })

    function createStaticQuad(quad, chunk) {
      var w = (quad[2] - quad[0]) / 2
      var h = (quad[3] - quad[1]) / 2
      var x = quad[0] + w + field.shape[0] * chunk.position[0]
      var y = quad[1] + h + field.shape[1] * chunk.position[1]

      var def = new b2BodyDef
      def.position = new b2Vec2(x * xscale, y * yscale)
      def.type = b2Body.b2_staticBody
      def.userData = datafn(quad, [x - w, y - h, w * 2, h * 2])

      var body = world.CreateBody(def)

      var fixturedef = new b2FixtureDef
      fixturedef.shape = new b2PolygonShape
      fixturedef.shape.SetAsBox(w * xscale, h * yscale)

      var fixture = body.CreateFixture(fixturedef)

      return body
    }
  }
}

function identity(d) {
  return d
}
