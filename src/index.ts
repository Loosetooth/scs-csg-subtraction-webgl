import { alphaIDMaterial } from "./alpha-material";
import * as THREE from "three";
import * as T from "three-full";
import { SCSRenderer } from "./SCSRenderer";
import { State } from "../src_old/state";
import { randomRGBColor, createHemiLight, createPointLight } from "./utils";
import { ScreenPlaneRenderer } from "./screen-plane-renderer";

console.log("Hello!");


const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const width = canvas.width;
const height = canvas.height;


// create renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  premultipliedAlpha: false,
  alpha: false,
  preserveDrawingBuffer: false
});

renderer.setClearColor(new THREE.Color().setRGB(1, 1, 1));

// Create scene
const scene = new THREE.Scene();

const cube = new THREE.Mesh(
  new THREE.BoxBufferGeometry(10, 10, 1),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
  // alphaIDMaterial(1)
);

//cube.material.side = THREE.DoubleSide;

const sphere = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

sphere.position.set(0, 0, 0.25);

const sphere2 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

sphere2.position.set(-2, -2, 0.25);

const sphere3 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

sphere3.position.set(2, 2, 0.25);

const sphere4 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

sphere4.position.set(2, 2, 4);

const sphere5 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

sphere5.position.set(2, -2, -4);

const intersectSphere1 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

intersectSphere1.position.set(-2, -2, 4);

const intersectSphere2 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

intersectSphere2.position.set(-1, -2, 4);

scene.add(cube);
scene.add(sphere);
scene.add(sphere2);
scene.add(sphere3);
scene.add(sphere4);
scene.add(sphere5);
scene.add(intersectSphere1);
scene.add(intersectSphere2);
sphere4.visible = false;

scene.add(createHemiLight());
scene.add(createPointLight(-40, 4, -40));
scene.add(createPointLight(60, 4, -40));
scene.add(createPointLight(-60, 4, 40));

const camera = new THREE.PerspectiveCamera(60, width / height);
camera.position.set(10, -2, 8);
const controls = new T.OrbitControls(camera);
window["scene"] = scene;
renderer.autoClear = false;

const state = new State(renderer.context);

const scsRenderer = new SCSRenderer(state, renderer);

let t = 0;
const frame = (dt: number = 0) => {
  renderer.clear();

  t += 0.025;
  let x = Math.sin(t);
  let y = Math.cos(t);

  sphere2.scale.set(1 + x, 1 + x, 1 + x);
  sphere3.scale.set(1 + x, 1 + x, 1 + x);
  sphere.scale.set(1 + y, 1 + y, 1 + y);
  intersectSphere2.position.set(-1 + x, -2, 4)

  scene.remove(intersectSphere1)
  scene.remove(intersectSphere2)
  scsRenderer.renderSubtract(
    scene,
    camera,
    cube,
    [sphere, sphere2, sphere3],
    sphere4
  );

  scene.add(intersectSphere1)
  scene.add(intersectSphere2)
  scsRenderer.renderSubtract(
    scene,
    camera,
    intersectSphere1,
    [intersectSphere2],
    sphere4
  );

  requestAnimationFrame(frame);
};

frame();
