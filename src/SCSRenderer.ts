import { createRenderTarget, drawMeshDirect } from "./utils";
import { State } from "../src_old/state";
import * as THREE from "three";
import { alphaIDMaterial, alphaFilterMaterial } from "./alpha-material";
import { ScreenPlaneRenderer } from "./screen-plane-renderer";

export class SCSRenderer {
  public state: State;
  public renderer: THREE.WebGLRenderer;
  public renderTarget?: THREE.WebGLRenderTarget;
  public fb1: THREE.WebGLRenderTarget;
  public fb2: THREE.WebGLRenderTarget;
  public dummyTarget: THREE.WebGLRenderTarget;
  public planeRenderer: ScreenPlaneRenderer;

  constructor(
    state: State,
    renderer: THREE.WebGLRenderer,
    renderTarget?: THREE.WebGLRenderTarget
  ) {
    this.state = state;
    this.renderer = renderer;
    this.renderTarget = renderTarget;

    // Create render targets
    const { width, height } = renderer.getSize();

    this.fb1 = createRenderTarget(width, height);
    this.fb2 = createRenderTarget(width, height);
    this.dummyTarget = createRenderTarget(width, height);

    this.planeRenderer = new ScreenPlaneRenderer(renderer, state, renderTarget);
  }

  /**
   * Use the SCS algorithm to render the CSG subtraction
   * of the `primitive` minus the primitives in `sequence`,
   * using the OpenCSG approach of transferring primitive surface
   * visibility using an alpha-channel coded ID.
   *
   * @param scene
   * @param camera
   * @param primitive
   * @param sequence
   * @param outputTarget
   */
  renderSubtract(
    scene: THREE.Scene,
    camera: THREE.Camera,
    primitive: THREE.Mesh,
    sequence: THREE.Mesh[],
    other: THREE.Mesh
  ) {
    this.state.push();
    // this.renderer.context.clearColor(0, 0, 0, 0);

    const gl = this.renderer.context;

    const render = () => {
      // Render to FB1
      this.renderer.setRenderTarget(this.fb2);
      this.renderer.clear();

      this.renderer.setRenderTarget(this.fb1);
      this.renderer.clear();

      // Draw front of X to Zbuffer
      this.state.set({
        // colorMask: [false, false, false, false],
        colorMask: [true, true, true, true],
        depthTest: true,
        depthMask: true,
        depthFunc: gl.ALWAYS,
        stencilTest: false,
        faceCulling: true,
        cullFace: gl.BACK
      });

      drawMeshDirect(this.renderer, primitive, camera, alphaIDMaterial(1));

      let stencilRef = 0;
      let id = 1;

      // For each subtracting primitive P
      for (let i = 0; i < sequence.length; i++) {
        stencilRef++;
        id++;

        // Flag in stencil fragments where Z_F_front < Z
        this.state.set({
          colorMask: [false, false, false, false],
          // colorMask: [true, true, true, true],
          depthTest: true,
          depthMask: false,
          depthFunc: gl.LESS,
          stencilTest: true,
          stencilMask: ~0,
          stencilFunc: [gl.ALWAYS, stencilRef, ~0],
          stencilOp: [gl.KEEP, gl.KEEP, gl.REPLACE],
          faceCulling: true,
          cullFace: gl.BACK
        });

        const p = sequence[i];
        drawMeshDirect(this.renderer, p, camera);

        // If Z_F_Back > Z && stencil == 1, Z = Z_F_BACK
        this.state.set({
          // colorMask: [false, false, false, false],
          colorMask: [true, true, true, true],
          faceCulling: true,
          cullFace: gl.FRONT,
          depthMask: true,
          depthFunc: gl.GREATER,
          stencilFunc: [gl.EQUAL, stencilRef, ~0],
          stencilOp: [gl.ZERO, gl.ZERO, gl.ZERO]
        });
        drawMeshDirect(this.renderer, p, camera, alphaIDMaterial(id));
      }

      // For each fragment F_back of X
      // If Z_F_back < Z
      //   alpha <- 0
      this.state.set({
        // colorMask: [false, false, false, false],
        colorMask: [true, true, true, true],
        depthMask: false,
        stencilTest: false,
        cullFace: gl.FRONT,
        depthFunc: gl.LESS
      });

      drawMeshDirect(this.renderer, primitive, camera, alphaIDMaterial(0));

      // OTHER
      other.visible = true;
      id++;

      this.state.set({
        // colorMask: [false, false, false, false],
        colorMask: [true, true, true, true],
        depthTest: true,
        depthMask: false,
        depthFunc: gl.LESS,
        stencilTest: false,
        stencilMask: 0,
        stencilFunc: [gl.ALWAYS, stencilRef, ~0],
        stencilOp: [gl.KEEP, gl.KEEP, gl.REPLACE],
        faceCulling: true,
        cullFace: gl.BACK
      });

      // drawMeshDirect(this.renderer, other, camera, alphaIDMaterial(id));

      primitive.visible = false;
      sequence.forEach(s => (s.visible = false));

      drawMeshDirect(this.renderer, scene, camera, alphaIDMaterial(id));

      primitive.visible = true;
      sequence.forEach(s => (s.visible = true));
      other.visible = false;
      // OTHER

      // (render to FB2 and read from FB1's color buffer)
      // this.renderer.setRenderTarget(this.fb2);
      this.renderer.setRenderTarget(this.fb2);

      // Draw front of X where alphaID = 1
      this.state.set({
        colorMask: [true, true, true, true],
        faceCulling: true,
        cullFace: gl.BACK,
        depthMask: false,
        depthFunc: gl.LESS,
        depthTest: false,
        stencilTest: false
      });

      drawMeshDirect(this.renderer, primitive, camera);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      this.renderer.setRenderTarget(this.renderTarget);
      this.planeRenderer.render(
        alphaFilterMaterial(1, this.fb1.texture, this.fb2.texture)
      );

      gl.disable(gl.BLEND);
    };

    const render2 = i => () => {
      let id = i + 2;
      const p = sequence[i];

      // (render to FB2 and read from FB1's color buffer)
      this.renderer.setRenderTarget(this.fb2);
      //this.renderer.clear();

      // Draw front of X where alphaID = 1
      this.state.set({
        cullFace: gl.FRONT,
        depthMask: true,
        depthFunc: gl.LESS,
        depthTest: false,
        stencilTest: false
      });

      // @ts-ignore
      drawMeshDirect(this.renderer, p, camera);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      this.renderer.setRenderTarget(this.renderTarget);
      this.planeRenderer.render(
        alphaFilterMaterial(id, this.fb1.texture, this.fb2.texture)
      );

      gl.disable(gl.BLEND);
    };

    other.visible = true;

    scene.onAfterRender = render;
    this.renderer.render(scene, camera, this.dummyTarget);
    other.visible = false;
    scene.onAfterRender = null;

    for (let i = 0; i < sequence.length; i++) {
      scene.onAfterRender = render2(i);
      this.renderer.render(scene, camera, this.dummyTarget);
    }

    const render3 = () => {
      this.renderer.setRenderTarget(this.fb2);
      this.renderer.clear();

      // Draw front of X where alphaID = 1
      this.state.set({
        cullFace: gl.BACK,
        depthMask: true,
        depthFunc: gl.LESS,
        depthTest: true,
        stencilTest: false
      });

      // @ts-ignore

      primitive.visible = false;
      sequence.forEach(s => (s.visible = false));

      drawMeshDirect(this.renderer, scene, camera);

      primitive.visible = true;
      sequence.forEach(s => (s.visible = true));
      other.visible = false;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      this.renderer.setRenderTarget(this.renderTarget);
      this.planeRenderer.render(
        alphaFilterMaterial(
          sequence.length + 2,
          this.fb1.texture,
          this.fb2.texture,
          true
        )
      );

      gl.disable(gl.BLEND);
    };

    scene.onAfterRender = render3;
    other.visible = true;
    this.renderer.render(scene, camera, this.dummyTarget);

    this.state.pop();
  }
}
