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
  depthBlendMaterial
} from "./utils";
import { ScreenPlane } from "./screen-plane";
import { renderGoldfeatherSubtract } from "./goldfeather";
import { Mesh, DepthTexture, Texture } from "three";

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

renderer.autoClear = false;
const frame = () => {
  target.dispose();
  target = createRenderTarget(width, height);

  // Clear framebuffer
  renderer.setRenderTarget();
  renderer.clear();

  // Clear framebuffer
  renderer.setRenderTarget(target);
  renderer.clear();

  renderer.setRenderTarget(target2);
  renderer.clear();

  renderer.setRenderTarget(target3);
  renderer.clear();

  renderer.setRenderTarget(target4);
  renderer.clear();

  renderer.setRenderTarget(target);
  // gl.clearColor(0, 0, 0, 0);
  const { stencil, depth, color } = renderer.state.buffers;

  renderer.clear();

  // 1 -> Render Front of BOX to Zbuffer
  state.push();
  state.set({
    depthTest: true,
    depthFunc: gl.ALWAYS,
    depthMask: true,
    faceCulling: true,
    cullFace: gl.BACK,
    colorMask: [false, false, false, false]
  });
  renderer.render(box, camera, target);

  // 2 -> Subtract SPHERE from BOX in the stencil buffer
  state.set({
    colorMask: [false, false, false, false],
    depthTest: true,
    depthMask: false,
    depthFunc: gl.LESS,
    stencilTest: true,
    stencilMask: 0x01,
    stencilFunc: [gl.ALWAYS, 0, ~0],
    stencilOp: [gl.KEEP, gl.KEEP, gl.INVERT],
    faceCulling: false
  });
  renderer.render(sphere, camera, target);

  // 3 -> Set Z -> Zfar for removed pixels
  state.set({
    colorMask: [false, false, false, false],
    depthTest: true,
    depthMask: true,
    depthFunc: gl.ALWAYS,
    stencilTest: true,
    stencilMask: 0x00,
    stencilFunc: [gl.NOTEQUAL, 0, 0x01],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
    faceCulling: false
  });
  renderer.render(zPlaneScene, zPlaneCamera, target);

  // renderer.setRenderTarget();

  // Render result to screen
  state.pop();
  renderer.setRenderTarget();

  renderer.render(zPlaneScene, zPlaneCamera, target2);
  renderer.render(zPlaneScene, zPlaneCamera, target3);
  // box.visible = true;
  // sphere.visible = false;
  renderer.render(box, camera, target4);

  renderTargetToPlane(
    target,
    null,
    depthBlendMaterial(
      target4.texture,
      target4.depthTexture,
      target3.depthTexture,
      target.depthTexture,
      target2.depthTexture
    ),
    true
  );

  // ----- Part 2
  renderer.setRenderTarget(target2);
  renderer.clear();

  state.push();
  state.set({
    depthTest: true,
    depthFunc: gl.ALWAYS,
    depthMask: true,
    faceCulling: true,
    cullFace: gl.FRONT,
    colorMask: [false, false, false, false]
  });
  renderer.render(sphere, camera, target2);

  // 2 -> Subtract SPHERE from BOX in the stencil buffer
  state.set({
    colorMask: [false, false, false, false],
    depthTest: true,
    depthMask: false,
    depthFunc: gl.LESS,
    stencilTest: true,
    stencilMask: 0x01,
    stencilFunc: [gl.ALWAYS, 0, ~0],
    stencilOp: [gl.KEEP, gl.KEEP, gl.INVERT],
    faceCulling: false
  });
  renderer.render(box, camera, target2);

  // 3 -> Set Z -> Zfar for removed pixels
  state.set({
    colorMask: [false, false, false, false],
    depthTest: true,
    depthMask: true,
    depthFunc: gl.ALWAYS,
    stencilTest: true,
    stencilMask: 0x00,
    stencilFunc: [gl.NOTEQUAL, 1, 0x01],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
    faceCulling: false
  });
  renderer.render(zPlaneScene, zPlaneCamera, target2);

  // -----

  // renderer.clear();
  // renderer.render(sphere, camera);

  // renderer.render(scene, camera);
  // Render result to screen
  state.pop();
  // renderer.setRenderTarget();

  // renderer.render(zPlaneScene, zPlaneCamera, target3);
  // box.visible = true;
  // sphere.visible = false;
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);
  renderer.setRenderTarget(target5);
  renderer.clear();
  renderer.render(scene, camera, target5);
  gl.cullFace(gl.BACK);
  renderer.setRenderTarget();

  //gl.enable(gl.BLEND);
  renderer.clear();

  renderTargetToPlane(
    target,
    null,
    depthBlendMaterial(
      target5.texture,
      target5.depthTexture,
      target3.depthTexture,
      target2.depthTexture,
      target.depthTexture
    ),
    false
  );

  // // next frame
  requestAnimationFrame(frame);
};

frame();

// --------------

export const depthCompositeMaterial = (camera, target) => {
  const vertexShader = `
  varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
`;
  const fragmentShader = `
  #include <packing>
			varying vec2 vUv;
			uniform sampler2D tDiffuse;
			uniform sampler2D tDepth;
			uniform float cameraNear;
			uniform float cameraFar;
			float readDepth( sampler2D depthSampler, vec2 coord ) {
				float fragCoordZ = texture2D( depthSampler, coord ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			}
			void main() {
				//vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );
				gl_FragColor.rgb = 1.0 - vec3( depth );
				gl_FragColor.a = 1.0;
			}`;
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      tDiffuse: { value: target.texture },
      tDepth: { value: target.depthTexture }
    }
  });
};
