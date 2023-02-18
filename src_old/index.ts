import * as THREE from "three";
import * as T from "three-full";
import { State } from "./state";
import {
  createBox,
  createHemiLight,
  createPointLight,
  renderMesh,
  _do,
  createSphere,
  createRenderTarget,
  depthShaderMaterial,
  drawZFar,
  depthBlendMaterial,
  createBox3
} from "./utils";
import { ScreenPlane } from "./screen-plane";
import { renderGoldfeatherSubtract } from "./goldfeather";
import { Mesh, DepthTexture, Texture, CubeCamera } from "three";

const width = 400;
const height = 300;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const offscreenCanvas = document.createElement("canvas") as HTMLCanvasElement;
offscreenCanvas.width = width;
offscreenCanvas.height = height;

const renderer = new THREE.WebGLRenderer({
  canvas,
  // canvas: offscreenCanvas,
  preserveDrawingBuffer: false,
  premultipliedAlpha: false
  // stencil: true
});

const gl = renderer.context;

const state = new State(gl);

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 6);
camera.position.set(2, 2, 2);
camera.lookAt(0, 0, 0);

const controls = new T.OrbitControls(camera, canvas);

const scene = new THREE.Scene();

//scene.add(createBox(1));
const box = createBox3(4, 4, 0.2);
const sphere = createSphere(0.5, [0.5, 0.5, 0]);
const otherSphere = createSphere(0.5, [-0.4, -0.2, 0]);

// sphere.add(otherSphere.children[0]);

scene.add(box);
scene.add(sphere);
scene.add(createHemiLight());
scene.add(createPointLight(-40, 4, -40));
scene.add(createPointLight(60, 4, -40));
scene.add(createPointLight(-60, 4, 40));
window["box"] = box;
renderer.setClearColor(new THREE.Color().setRGB(0.1, 0.1, 0.4));

// let target = createRenderTarget(width, height);
// const target2 = createRenderTarget(width, height);

let target = createRenderTarget(width, height);
let target2 = createRenderTarget(width, height);
let target3 = createRenderTarget(width, height);
let target4 = createRenderTarget(width, height);
let target5 = createRenderTarget(width, height);

const depthScreenPlane = new ScreenPlane(
  renderer,
  depthShaderMaterial(camera, target),
  document.getElementById("canvas2") as HTMLCanvasElement
);

const mainScreenPlane = new ScreenPlane(
  renderer,
  new THREE.MeshBasicMaterial({ map: target.texture }),
  document.getElementById("canvas") as HTMLCanvasElement
);
renderer.autoClear = false;

let step = 0;
document.getElementById("step").addEventListener("click", () => {
  step = (step + 1) % 6;
  document.getElementById("count").innerText = `${step}`;
});

const dummyTarget = createRenderTarget(width, height, false, false);

const g = new THREE.BoxBufferGeometry(2, 2, 2);
const m = new THREE.MeshBasicMaterial({ color: "blue" });
const c = new THREE.Mesh(g, m);
window["renderer"] = renderer;
// scene.add(c);
// renderer.render(scene, camera, target);
// scene.remove(c);

const zPlaneScene = new THREE.Scene();
const plane = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(2, 2),
  new THREE.MeshBasicMaterial({ color: "red" })
);

zPlaneScene.add(plane);

plane.position.set(0, 0, -1);

const zPlaneCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
zPlaneCamera.position.set(0, 0, -0.00001);
zPlaneCamera.lookAt(0, 0, -1);

renderer.render(zPlaneScene, zPlaneCamera, dummyTarget);

const boxMesh = box.children[0] as Mesh;
const sphereMesh = sphere; // sphere.children[0] as Mesh;
const drawMesh = (m: THREE.Mesh | THREE.Scene, c = camera) => {
  //@ts-ignore
  if (m instanceof THREE.Scene) {
    m.children.forEach(obj => {
      if (obj.type === "Mesh") {
        //@ts-ignore
        renderer.renderBufferDirect(
          camera,
          null,
          // @ts-ignore
          obj.geometry,
          // @ts-ignore
          obj.material,
          obj,
          null
        );
      }
    });
  } else {
    //@ts-ignore
    renderer.renderBufferDirect(camera, null, m.geometry, m.material, m, null);
  }
};

// Renders a given srcTarget texture to a destination target
const renderTargetToPlane = (srcTarget, dstTarget?, mat?, depth = false) => {
  if (mat) {
    plane.material = mat;
  } else if (depth) {
    plane.material = depthShaderMaterial(camera, target);
  } else {
    plane.material = new THREE.MeshBasicMaterial({
      map: srcTarget.texture
    });
  }

  renderer.render(zPlaneScene, zPlaneCamera, dstTarget);

  plane.material = new THREE.MeshBasicMaterial({
    color: "red"
  });
};

// ---------------------------------------------------------------------------
window["target"] = target;
window["THREE"] = THREE;

const pass1 = () => {
  renderer.setRenderTarget();

  state.push();
  renderer.clearStencil();

  state.set({
    // colorMask: [true, true, true, true],
    colorMask: [false, false, false, false],
    faceCulling: true,
    cullFace: gl.BACK,
    depthTest: true,
    depthMask: true,
    depthFunc: gl.ALWAYS,
    stencilTest: false
  });
  drawMesh(boxMesh, camera);

  state.set({
    // colorMask: [true, true, true, true],
    colorMask: [false, false, false, false],
    faceCulling: true,
    cullFace: gl.BACK,
    depthTest: true,
    depthMask: false,
    depthFunc: gl.LEQUAL,
    stencilTest: true,
    stencilMask: 0xffffffff,
    stencilFunc: [gl.ALWAYS, 1, 0xffffffff],
    stencilOp: [gl.KEEP, gl.KEEP, gl.REPLACE]
  });
  drawMesh(sphereMesh, camera);

  state.set({
    // colorMask: [true, true, true, true],
    colorMask: [false, false, false, false],
    faceCulling: true,
    cullFace: gl.FRONT,
    depthTest: true,
    depthMask: true,
    depthFunc: gl.GEQUAL,
    stencilTest: true,
    stencilMask: 0,
    stencilFunc: [gl.EQUAL, 1, 0xffffffff],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP]
  });
  drawMesh(sphereMesh, camera);

  gl.stencilMask(0xff);
  gl.clear(gl.STENCIL_BUFFER_BIT);

  gl.clear(gl.STENCIL_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  renderer.clearStencil();

  state.set({
    // colorMask: [true, true, true, true],
    colorMask: [false, false, false, false],
    faceCulling: true,
    cullFace: gl.FRONT,
    depthTest: true,
    depthMask: false,
    depthFunc: gl.LESS,
    stencilTest: true,
    stencilMask: 0xffffffff,
    stencilFunc: [gl.ALWAYS, 1, 0xffffffff],
    stencilOp: [gl.KEEP, gl.KEEP, gl.REPLACE]
  });
  drawMesh(boxMesh, camera);

  state.set({
    //colorMask: [true, true, true, true],
    colorMask: [false, false, false, false],
    faceCulling: false,
    depthTest: true,
    depthMask: true,
    depthFunc: gl.ALWAYS,
    stencilTest: true,
    stencilMask: 0,
    stencilFunc: [gl.EQUAL, 1, 0xffffffff],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP]
  });
  //@ts-ignore
  drawMesh(plane, zPlaneCamera);

  state.set({
    colorMask: [true, true, true, true],
    faceCulling: true,
    cullFace: gl.BACK,
    depthTest: true,
    depthMask: false,
    depthFunc: gl.EQUAL,
    stencilTest: false
  });
  //@ts-ignore
  drawMesh(boxMesh, camera);

  state.set({
    colorMask: [true, true, true, true],
    faceCulling: true,
    cullFace: gl.FRONT,
    depthTest: true,
    depthMask: false,
    depthFunc: gl.EQUAL,
    stencilTest: false
  });
  //@ts-ignore
  drawMesh(sphereMesh, camera);

  state.pop();
};

renderer.autoClear = false;
const frame = () => {
  // renderer.clear();
  renderer.render(zPlaneScene, zPlaneCamera, dummyTarget);

  renderer.setRenderTarget();
  renderer.clear();

  scene.onAfterRender = pass1;
  renderer.render(scene, camera, dummyTarget);

  // // next frame
  requestAnimationFrame(frame);
};

frame();

// --------------
