import * as THREE from "three";
import { State } from "./state";

type Color = [number, number, number, number?];

export const createMesh = (
  geometry: THREE.BufferGeometry,
  position?: number[],
  color?
): THREE.Scene => {
  color = color
    ? new THREE.Color().setRGB(color[0], color[1], color[2])
    : new THREE.Color().setRGB(Math.random(), Math.random(), Math.random());

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color })
  );

  position && mesh.position.set(position[0], position[1], position[2]);

  const scene = new THREE.Scene();
  scene.add(mesh);

  return scene;
};

export const createBox = (
  size: number,
  position?: number[],
  color?
): THREE.Scene => {
  return createMesh(
    new THREE.BoxBufferGeometry(size, size, size, 2, 2, 2),
    position,
    color
  );
};

export const createBox3 = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  position?: number[],
  color?
): THREE.Scene => {
  return createMesh(
    new THREE.BoxBufferGeometry(sizeX, sizeY, sizeZ, 2, 2, 2),
    position,
    color
  );
};

export const createSphere = (
  size: number,
  position?: number[],
  color?
): THREE.Scene => {
  return createMesh(
    new THREE.SphereBufferGeometry(size, 100, 100),
    position,
    color
  );
};

export const createHemiLight = (): THREE.HemisphereLight => {
  return new THREE.HemisphereLight(
    new THREE.Color().setRGB(1, 1, 1),
    new THREE.Color().setRGB(0.6, 0.6, 0.6),
    1
  );
};

export const createPointLight = (
  x: number,
  y: number,
  z: number
): THREE.PointLight => {
  const light = new THREE.PointLight(new THREE.Color().setRGB(1, 1, 1), 0.3);
  light.position.set(x, y, z);

  return light;
};

export const renderMesh = (
  renderer,
  state: State,
  scene: THREE.Scene,
  camera,
  target?
) => cb => {
  const mesh = scene.children[0] as THREE.Mesh;
  mesh.onBeforeRender = () => {
    state.apply();
    cb();
  };
  renderer.render(scene, camera, target);
  delete mesh.onBeforeRender;
  return Promise.resolve(cb);
};

export const _do = cb => Promise.resolve(cb);

export const createRenderTarget = (
  width,
  height,
  depth = true,
  stencil = true
) => {
  const target = new THREE.WebGLRenderTarget(width, height, {
    stencilBuffer: true
  });
  target.texture.format = THREE.RGBAFormat;
  target.texture.type = THREE.FloatType;
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.texture.generateMipmaps = false;
  target.stencilBuffer = stencil;
  target.depthBuffer = depth;
  if (depth) {
    //@ts-ignore
    target.depthTexture = new THREE.DepthTexture(
      width,
      height,
      undefined,
      undefined,
      undefined,
      undefined,
      THREE.NearestFilter,
      THREE.NearestFilter,
      undefined,
      THREE.DepthStencilFormat
    );
    // target.depthTexture.type = THREE.UnsignedShortType;
  }

  return target;
};

export const depthShaderMaterial = (camera, target) => {
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

export const drawZFar = (
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  z = 1
) => {
  const gl = renderer.context;
  // state.push();
  // state.set({
  //   colorMask: [false, false, false, false],
  //   depthMask: true,
  //   depthFunc: gl.LESS,
  //   depthTest: true
  // });

  const scene = new THREE.Scene();
  const plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2, 2),
    new THREE.MeshBasicMaterial({ color: "red" })
  );

  scene.add(plane);

  plane.position.set(0, 0, -z);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  camera.position.set(0, 0, -0.00001);
  camera.lookAt(0, 0, -1);

  renderer.render(scene, camera, target);

  //state.pop();
};

export const depthBlendMaterial = (
  texture,
  depthTexture,
  backgroundDepth,
  depthLayer1,
  depthLayer2
) => {
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
      uniform sampler2D tDepthBackground;
      uniform sampler2D tDepthLayer1;
      uniform sampler2D tDepthLayer2;

			float readDepth( sampler2D depthSampler, vec2 coord ) {
				float fragCoordZ = texture2D( depthSampler, coord ).x;
				return fragCoordZ;
			}
			void main() {
        float depth = readDepth(tDepth, vUv);
        float depthBg = readDepth(tDepthBackground, vUv);
        float depthLayer1 = readDepth(tDepthLayer1, vUv);
        float depthLayer2 = readDepth(tDepthLayer2, vUv);

        if (
          (depth <= depthBg) &&
          (depth >= (depthLayer1 - 0.012)) &&
          (depth <= (depthLayer1 + 0.012)) &&
          (depth <= depthLayer2)
          ) {
          gl_FragColor.rgb = texture2D(tDiffuse, vUv).rgb;
        } else {
          // gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          discard;
        }
			}`;
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tDiffuse: { value: texture },
      tDepth: { value: depthTexture },
      tDepthBackground: { value: backgroundDepth },
      tDepthLayer1: { value: depthLayer1 },
      tDepthLayer2: { value: depthLayer2 }
    }
  });
};
