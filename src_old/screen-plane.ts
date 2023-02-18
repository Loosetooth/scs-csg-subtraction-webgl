import * as THREE from "three";
import { MeshMaterialType } from "three";
import { createRenderTarget } from "./utils";

export class ScreenPlane {
  private renderer: THREE.WebGLRenderer;
  private plane: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderTarget?: THREE.RenderTarget;
  private canvas?: HTMLCanvasElement;

  constructor(
    renderer: THREE.WebGLRenderer,
    material: THREE.MeshMaterialType,
    canvas?: HTMLCanvasElement
  ) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), material);
    this.scene.add(this.plane);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    if (canvas) {
      //this.renderTarget = createRenderTarget(canvas.width, canvas.height);
      this.canvas = canvas;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera, this.renderTarget);

    if (this.canvas) {
      this.canvas.getContext("2d").drawImage(this.renderer.domElement, 0, 0);
    }
  }
}
