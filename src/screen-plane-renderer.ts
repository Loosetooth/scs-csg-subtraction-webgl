import * as THREE from "three";
import { State } from "../src_old/state";

export class ScreenPlaneRenderer {
  public target: THREE.WebGLRenderTarget;
  public renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private plane: THREE.Mesh;
  private state: State;

  constructor(
    renderer: THREE.WebGLRenderer,
    state: State,
    target?: THREE.WebGLRenderTarget
  ) {
    this.target = target;
    this.renderer = renderer;
    this.state = state;

    this.scene = new THREE.Scene();

    this.plane = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(2, 2),
      new THREE.MeshBasicMaterial({ color: "white" })
    );

    this.scene.add(this.plane);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  render(texture?: THREE.Texture | THREE.MeshMaterialType) {
    let isTexture = false;
    let oldMaterial = null;
    if (texture instanceof THREE.Texture) {
      isTexture = true;
      (this.plane.material as THREE.MeshBasicMaterial).map = texture;
    } else if (texture) {
      oldMaterial = this.plane.material;
      this.plane.material = texture;
    } else {
      isTexture = true;
    }

    const gl = this.renderer.context;

    this.state.push();
    this.state.set({
      cullFace: gl.BACK
    });

    this.renderer.render(this.scene, this.camera, this.target);

    if (!isTexture) {
      this.plane.material = oldMaterial;
    }

    this.state.pop();
  }
}
