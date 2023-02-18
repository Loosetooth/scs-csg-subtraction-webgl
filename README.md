# A CSG proof of concept implementing the SCS algorithm

This repo is a proof of concept that does simple image-based Constructive Solid Geometry (CSG) using the Sequenced Convex Subtraction (SCS) method. Basic subtraction and intersection are implemented. The actual object rendering is done using WebGL and Three.js.

See original blog post [here](https://medium.com/@daniel.mbfm/csg-subtracting-solids-in-webgl-dadc6126c041).

### Test in the browser
Check out [the deployment](https://loosetooth.github.io/scs-csg-subtraction-webgl/). Currently only runs on desktop browsers.

### Run locally
You will need node.js and yarn installed.
Clone the repo, and then:
`yarn`

`yarn start`

### How was this made?

This repo is based on [this blog post](https://medium.com/@daniel.mbfm/csg-subtracting-solids-in-webgl-dadc6126c041). However, only subtraction was implemented, and some fixes were required to get it running. The intersection function was added. It follows the pseudocode as described in the [SCS paper](http://www.nigels.com/research/wscg2000.pdf).