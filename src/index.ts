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

sphere4.position.set(2, -2, 4);

const sphere5 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

sphere5.position.set(2, -2, -4);

const subtractSphere1 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

subtractSphere1.position.set(-2, -2, 4);

const subtractSphere2 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

subtractSphere2.position.set(-1, -2, 4);

const jscadCube = new THREE.Mesh(
  new THREE.BoxBufferGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
)

jscadCube.position.set(2, 2, 4);

const jscadSphere = new THREE.Mesh(
  new THREE.SphereBufferGeometry(0.6, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

jscadSphere.position.set(2, 2, 4);

const jscadCube2 = new THREE.Mesh(
  new THREE.BoxBufferGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
)

jscadCube2.position.set(2, 2, 4);

const jscadSphere2 = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1.3, 22, 22),
  new THREE.MeshStandardMaterial({ color: randomRGBColor() })
);

jscadSphere2.position.set(2, 2, 4);

scene.add(cube);
scene.add(sphere);
scene.add(sphere2);
scene.add(sphere3);
scene.add(sphere4);
scene.add(sphere5);
scene.add(subtractSphere1);
scene.add(subtractSphere2);
scene.add(jscadCube);
scene.add(jscadSphere);
scene.add(jscadCube2);
scene.add(jscadSphere2);
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
  subtractSphere2.position.set(-1 + x, -2, 4)

  scene.remove(subtractSphere1)
  scene.remove(subtractSphere2)
  scene.remove(jscadCube)
  scene.remove(jscadSphere)
  scene.remove(jscadCube2)
  scene.remove(jscadSphere2)
  scsRenderer.renderSubtract(
    scene,
    camera,
    cube,
    [sphere, sphere2, sphere3],
    sphere4
  );

  scene.add(subtractSphere1)
  scene.add(subtractSphere2)
  scsRenderer.renderIntersect(
    scene,
    camera,
    subtractSphere1,
    [subtractSphere2],
    sphere4
  );

  scene.add(jscadCube)
  scene.add(jscadSphere)
  scsRenderer.renderIntersect(
    scene,
    camera,
    jscadCube,
    [jscadSphere],
    sphere4
  );

  scene.add(jscadCube2)
  scene.add(jscadSphere2)
  scsRenderer.renderSubtract(
    scene,
    camera,
    jscadCube2,
    [jscadSphere2],
    sphere4
  );

  requestAnimationFrame(frame);
};

frame();
