import { randomRGBColor } from "./utils";
import * as THREE from "three";
import { Color } from "three";

export const alphaIDMaterial = (
  id: number,
  color: number[] = randomRGBColor().toArray()
): THREE.ShaderMaterial => {
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform int uId;

    void main() {
      float a = float(uId) / 255.0;

      gl_FragColor = vec4(uColor.rgb, a);
    }`;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uId: { value: id },
      uColor: { value: color } // randomRGBColor().toArray() }
    }
  });
};

export const alphaFilterMaterial = (
  id: number,
  alphaIdTexture,
  colorTexture,
  drawOnZero = false,
  color: number[] = randomRGBColor().toArray()
): THREE.ShaderMaterial => {
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

  const fragmentShader = `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform int uId;
    uniform int uDrawOnZero;
    uniform sampler2D tAlphaId;
    uniform sampler2D tColorTexture;

    void main() {
      float a = texture2D(tAlphaId, vUv).a;
      vec3 color = texture2D(tColorTexture, vUv).rgb;

      int alphaId = int(a * 255.0);

      if (alphaId == 0) {
        if (uDrawOnZero != 0) {
          gl_FragColor = vec4(color, 1.0);
        } else {
          discard;
        }
      } else if (alphaId != uId) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      } else {
        gl_FragColor = vec4(color, 1.0);
      }
    }`;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uId: { value: id },
      tAlphaId: { value: alphaIdTexture },
      tColorTexture: { value: colorTexture },
      uColor: { value: color },
      uDrawOnZero: { value: drawOnZero }
    }
  });
};
