export const VERTEX = `
varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntensity;

void main() {
  vUv = uv;
  vec3 pos = position;
  // Wind wave: horizontal sine, amplitude grows toward right edge.
  float wave = sin(pos.x * 4.0 + uTime * 2.0) * 0.04 * uv.x * uIntensity;
  // Cursor warp: smoothstep bump around uMouse.
  float d = distance(uv, uMouse);
  float warp = smoothstep(0.4, 0.0, d) * 0.06 * uIntensity;
  pos.z += wave + warp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const FRAGMENT = `
varying vec2 vUv;
uniform sampler2D uMap;
void main() {
  gl_FragColor = texture2D(uMap, vUv);
}
`;
