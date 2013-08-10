var blockSize = 40
var canvas = document.createElement('canvas')

var Box2D = require('box2dweb-commonjs').Box2D
var b2Vec2 = Box2D.Common.Math.b2Vec2
var b2World = Box2D.Dynamics.b2World
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
var b2BodyDef = Box2D.Dynamics.b2BodyDef
var b2Body = Box2D.Dynamics.b2Body

/**
 * Setup
 */
var ticker = require('ticker')
var vkey = require('vkey')
var zeros = require('zeros')
var aabb = require('aabb-2d')
var levelup = require('levelup')
var debounce = require('debounce')
var cave = require('cave-automata-2d')

var db = levelup(require('./package.json').name, {
  db: require('level-js')
})

var field = require('ndarray-continuous')({
  shape: [32, 32],
  getter: function(pos, done) {
    var array = zeros(this.shape)
    return done(null, cave(array)(10))
  }
}).on('remove', function(chunk) {
  storage.save(chunk)
})

var storage = require('continuous-storage')(db, field, {
  index: function(position) {
    return 'chunk:' + position.join(':')
  }
})

var world = new b2World(new b2Vec2(0, 50), true)
var player = require('box2d-player')(Box2D)(world, {
    position: new b2Vec2(5, 0)
  , jumpHeight: 20
})
var chunker = require('./')(Box2D)(world, field, {
    xscale: 1
  , yscale: 1
  , data: function(aabb, pos) {
    return { type: 'wall', aabb: aabb, pos: pos }
  }
})

var pointer = require('pointer-trap')(document.createElement('canvas'))
var moveTo = require('continuous-observer')(field, 1)

// Don't call save until 1000ms after the last
// save call has finished - stops overloading the
// database, but still giving near-instant saves.
storage.saveall = debounce(storage.saveall, 1000, false)

/**
 * Input
 */
var movex = 0
var jumping = false
function keydown(key) {
  switch (key) {
    case 'W': case '<up>':    jumping = true; break
    case 'A': case '<left>':  movex = -8; break
    case 'D': case '<right>': movex = +8; break
  }
}
function keyup(key) {
  switch (key) {
    case 'W': case '<up>':  jumping = false; break
    case 'A': case '<left>':  movex = 0; break
    case 'D': case '<right>': movex = 0; break
  }
}

document.body.addEventListener('keydown', function(e) {
  keydown(vkey[e.keyCode])
}, false)
document.body.addEventListener('keyup', function(e) {
  keyup(vkey[e.keyCode])
}, false)

/**
 * Game "loop"
 */
ticker(canvas, 60, 2)
  .on('tick', tick)
  .on('draw', draw)

/**
 * Updating the physics and generating
 * chunks depending on the player's
 * position
 */
var tickrate = 1 / 60
var jumpcountdown = 0
function tick() {
  player.body.m_linearVelocity.x = movex
  if (jumping) {
    if (!player.jump()) {
      if (!jumpcountdown) {
        tempvec.x =  0
        tempvec.y = player.body.m_linearVelocity.y > 0 ? -5 : -1
        player.body.ApplyImpulse(tempvec, player.body.GetWorldCenter())
      }
    } else {
      jumpcountdown = 0.35
    }
  }

  jumpcountdown = Math.max(0, jumpcountdown - tickrate)
  world.Step(tickrate, 8, 3)

  moveTo([
      player.body.m_xf.position.x
    , player.body.m_xf.position.y
  ])
}

/**
 * Drawing to the screen
 */
var camx = 0
var camy = 0
var ctx = canvas.getContext('2d')
var tempvec = new b2Vec2
function draw() {
  var data
  var width = canvas.width
  var height = canvas.height

  camx = player.body.m_xf.position.x * 30
  camy = player.body.m_xf.position.y * 30

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)

  for (var obj = world.m_bodyList; obj; obj = obj.m_next) {
    data = obj.m_userData
    if (!data) continue
    if (data.type === 'wall') {
      ctx.fillStyle = '#444'
      var x = data.pos[0] * 30 + 1 - camx + width / 2
        , y = data.pos[1] * 30 + 1 - camy + height / 2
        , w = data.pos[2] * 30 - 2
        , h = data.pos[3] * 30 - 2
      if (
        x + w >= 0 ||
        y + h >= 0 ||
        x < width ||
        y < height
      ) {
        ctx.fillRect(x, y, w, h)
      }
    } else
    if (data.type === 'circle') {
      var x = obj.m_xf.position.x * 30 - camx + width / 2
        , y = obj.m_xf.position.y * 30 - camy + height / 2

      ctx.fillStyle = '#FFC725'
      drawCircle(ctx, x, y, data.scale * 30)
    }
  }

  ctx.fillStyle = '#85CAE8'
  ctx.fillRect(
      width/2 - 14
    , height/2 - 14
    , 28
    , 28
  )
}

/**
 * Create bodies when clicking
 */
canvas.addEventListener('click', function(e) {
  var cx = e.offsetX / 30
  var cy = e.offsetY / 30
  var px = player.body.m_xf.position.x
  var py = player.body.m_xf.position.y
  var x = px + cx - canvas.width / 60
  var y = py + cy - canvas.height / 60

  var def = new b2BodyDef
  var scale = Math.random() + 0.5
  def.position = new b2Vec2(x, y)
  def.type = b2Body.b2_dynamicBody
  def.userData = { type: 'circle', scale: scale }

  var body = world.CreateBody(def)

  var fixdef = new b2FixtureDef
  fixdef.shape = new b2CircleShape(scale)
  var fixture = body.CreateFixture(fixdef)
  setTimeout(function() {
    body.DestroyFixture(fixture)
    world.DestroyBody(body)
  }, 30000)
}, false)

/**
 * DOM Setup
 */
document.body.style.margin = 0
document.body.style.padding = 0
document.body.style.overflow = 'hidden'
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

process.nextTick(function() {
  moveTo([0, 0])
})

var tau = Math.PI * 2
function drawCircle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, tau, true)
  ctx.closePath()
  ctx.fill()
}
