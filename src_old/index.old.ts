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
  drawZFar
} from "./utils";
import { ScreenPlane } from "./screen-plane";
import { renderGoldfeatherSubtract } from "./goldfeather";
import { Mesh, DepthTexture } from "three";

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
  stencil: true
});

const gl = renderer.context;

const state = new State(gl);

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 6);
camera.position.set(2, 2, 2);
camera.lookAt(0, 0, 0);

const controls = new T.OrbitControls(camera, canvas);

const scene = new THREE.Scene();

//scene.add(createBox(1));
const box = createBox(1);
const sphere = createSphere(0.4, [0.5, 0.5, 0.5]);

scene.add(box);
scene.add(sphere);
scene.add(createHemiLight());
scene.add(createPointLight(-40, 4, -40));
scene.add(createPointLight(60, 4, -40));
scene.add(createPointLight(-60, 4, 40));
window["box"] = box;
renderer.setClearColor(new THREE.Color().setRGB(0.2, 0.2, 0.4));

const target = createRenderTarget(width, height);
const target2 = createRenderTarget(width, height);
const target3 = createRenderTarget(width, height);
const target4 = createRenderTarget(width, height);

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
  new THREE.MeshBasicMaterial({ color: "white" })
);

zPlaneScene.add(plane);

plane.position.set(0, 0, -1);

const zPlaneCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
zPlaneCamera.position.set(0, 0, -0.00001);
zPlaneCamera.lookAt(0, 0, -1);

renderer.render(zPlaneScene, zPlaneCamera, dummyTarget);

const boxMesh = box.children[0] as Mesh;
const sphereMesh = sphere.children[0] as Mesh;
const drawMesh = (m: THREE.Mesh, c = camera) => {
  //@ts-ignore
  renderer.renderBufferDirect(camera, null, m.geometry, m.material, m, null);
};

// Renders a given srcTarget texture to a destination target
const renderTargetToPlane = (srcTarget, dstTarget?, mat?, depth = false) => {
  const material = plane.material as THREE.MeshBasicMaterial;

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
// const pass1 = () => {
//   renderer.setRenderTarget(target);
//   drawMesh(boxMesh, camera);
//   renderer.setRenderTarget();
// };

// const pass2 = () => {
//   renderer.setRenderTarget(target);
//   drawMesh(sphereMesh, camera);
//   renderer.setRenderTarget();
// };

const drawBackOfBoxIntoTempTarget = () => {
  // renderer.render(zPlaneScene, zPlaneCamera, dummyTarget);
  renderer.setRenderTarget(target);
  state.push();
  state.set({
    depthTest: true,
    depthFunc: gl.ALWAYS,
    depthMask: true,
    stencilTest: true,
    stencilFunc: [gl.ALWAYS, ~0, ~0],
    stencilMask: 0xff,
    stencilOp: [gl.INCR, gl.INCR, gl.INCR],
    faceCulling: true,
    cullFace: gl.BACK
  });
  state.pop();

  drawMesh(boxMesh, camera);

  renderer.setRenderTarget();
};

const subtractSphereFromBox = () => {
  renderer.setRenderTarget(target);
  state.push();

  state.set({
    depthTest: true,
    depthFunc: gl.LEQUAL,
    depthMask: false,
    colorMask: [true, true, true, true], // [false, false, false, false],
    stencilTest: true,
    faceCulling: false,
    stencilFunc: [gl.EQUAL, 0, ~0],
    stencilMask: 0x01,
    stencilOp: [gl.KEEP, gl.KEEP, gl.INVERT]
  });

  drawMesh(sphereMesh, camera);

  // state.pop();
  renderer.setRenderTarget();
};
renderer.autoClear = false;
const frame = () => {
  // Clear  texture target
  renderer.setRenderTarget(target);
  renderer.clear();

  // Clear texture target 2
  renderer.setRenderTarget(target2);
  renderer.clear();

  // Clear texture target 2
  renderer.setRenderTarget(target3);
  renderer.clear();

  renderer.setRenderTarget(target4);
  renderer.clear();

  // Clear framebuffer
  renderer.setRenderTarget();
  renderer.clear();

  const { stencil, depth, color } = renderer.state.buffers;

  renderer.setRenderTarget(target);
  renderer.clear();

  // stencil.setTest(true);
  // stencil.setMask(0x01);
  // stencil.setFunc(gl.ALWAYS, 0, 0x01);
  // stencil.setOp(gl.KEEP, gl.KEEP, gl.INVERT);
  // color.setMask(0);

  // renderer.render(sphere, camera);

  // stencil.setTest(true);
  // stencil.setMask(0x00);
  // stencil.setFunc(gl.NOTEQUAL, 0, 0x01);
  // stencil.setOp(gl.KEEP, gl.KEEP, gl.KEEP);
  // color.setMask(1);
  renderer.render(scene, camera, target);

  // // Draw pass 1
  // scene.onAfterRender = drawBackOfBoxIntoTempTarget;
  // renderer.render(scene, camera, dummyTarget);

  // // // Draw pass 2
  // scene.onAfterRender = subtractSphereFromBox;
  // renderer.render(scene, camera, dummyTarget);

  // // reset state
  // state.reset();

  // // Render texture to framebuffer
  // stencil.setTest(false);

  renderer.render(zPlaneScene, zPlaneCamera, target2);
  renderer.render(zPlaneScene, zPlaneCamera, target3);

  renderer.setRenderTarget();
  renderer.clear();
  renderTargetToPlane(target, null, null, false);

  // // next frame
  requestAnimationFrame(frame);
};

frame();
