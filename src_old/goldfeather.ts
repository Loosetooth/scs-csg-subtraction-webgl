import * as THREE from "three";
import { State } from "./state";
import { drawZFar } from "./utils";
import { GLTFExporter } from "three";

type CSGElement = {
  shape: THREE.Scene;
  positive: boolean;
};

type CSGProduct = [CSGElement, CSGElement];

export const renderGoldfeatherSubtract = (
  state: State,
  renderer: THREE.WebGLRenderer,
  camera,
  target: THREE.WebGLRenderTarget,
  product: CSGProduct,
  step: number
) => {
  const gl = renderer.context;

  state.push();
  state.set({
    colorMask: [false, false, false, false],
    depthFunc: gl.ALWAYS,
    depthMask: true,
    depthTest: true
  });

  for (let i = 0; i < product.length; i++) {
    const element = product[i];

    state.push();
    state.set({
      faceCulling: true,
      cullFace: element.positive ? gl.BACK : gl.FRONT,
      stencilTest: false
    });

    renderer.render(element.shape, camera, target);

    let bit = 0;
    let mask = 0;
    for (let j = 0; j < product.length; j++) {
      const otherElement = product[j];
      if (j != i) {
        if (otherElement.positive) {
          mask = parityIntersect(
            renderer,
            state,
            camera,
            target,
            otherElement.shape,
            bit,
            gl.LEQUAL,
            mask
          );
        } else {
          mask = paritySubtract(
            renderer,
            state,
            camera,
            target,
            otherElement.shape,
            bit,
            gl.LEQUAL,
            mask
          );
        }
        bit += 1;
      }
      if (j === product.length - 1 && bit) {
        parityApply(renderer, target, camera, state, mask, ~0);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        mask = 0;
        bit = 0;
      }
    }

    state.pop();
  }

  state.pop();
};

const parityTest = (
  renderer: THREE.WebGLRenderer,
  state: State,
  camera,
  target,
  shape: THREE.Scene,
  bit: number,
  depthFunc: number
) => {
  const gl = renderer.context;
  const mask = 1 << bit;

  state.push();
  state.set({
    stencilTest: true,
    stencilOp: [gl.KEEP, gl.KEEP, gl.INVERT],
    stencilFunc: [gl.ALWAYS, ~0, ~0],
    stencilMask: mask,
    depthTest: true,
    depthFunc,
    depthMask: false,
    colorMask: [false, false, false, false],
    faceCulling: false
  });

  renderer.render(shape, camera, target);
  state.pop();
};

const paritySubtract = (
  renderer: THREE.WebGLRenderer,
  state: State,
  camera,
  target,
  shape: THREE.Scene,
  bit: number,
  depthFunc: number,
  mask: number
): number => {
  parityTest(renderer, state, camera, target, shape, bit, depthFunc);
  return mask & ~(1 << bit);
};

const parityIntersect = (
  renderer: THREE.WebGLRenderer,
  state: State,
  camera,
  target,
  shape: THREE.Scene,
  bit: number,
  depthFunc: number,
  mask: number
): number => {
  parityTest(renderer, state, camera, target, shape, bit, depthFunc);
  return mask | (1 << bit);
};

const parityApply = (
  renderer: THREE.WebGLRenderer,
  target,
  camera,
  state: State,
  parityMask: number,
  stencilMask: number
) => {
  const gl = renderer.context;
  state.push();
  state.set({
    stencilTest: true,
    stencilFunc: [gl.NOTEQUAL, parityMask, stencilMask],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
    stencilMask: 0,
    depthTest: true,
    depthFunc: gl.ALWAYS,
    depthMask: true,
    faceCulling: false
  });

  //drawZFar(renderer, target, state, camera.near, camera.far);

  state.pop();
};
