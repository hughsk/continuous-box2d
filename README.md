# continuous-box2d [![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges) #

Generate a bunch of box2d bodies to match a grid backed by
[ndarray-continuous](http://github.com/hughsk/ndarray-continuous).

The demo still needs some tweaking/optimisation work but you can find it
[here](http://hughsk.github.io/continuous-box2d). It also shares a lot
of code with the
[topdown-physics demo](http://hughsk.github.io/topdown-physics).

## Installation ##

``` bash
npm install continuous-box2d
```

## Usage ##

### `cb2d = require('continuous-box2d')(Box2D)` ###

Pass Box2D to the module to get back a `continuous-box2d`.

### `cb2d(world, field[, options])` ###

Generates and removes bodies to `world` as chunks are added/removed to the
continuous ndarray `field`. Takes the following options:

* `data`: A callback to modify the `userData` that gets attached to each body.
* `xscale`: the horizontal scale of the grid, in cell units to box2d units. Defaults to 1.
* `yscale`: the vertical scale of the grid. Defaults to 1.
