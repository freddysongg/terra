uniform vec3 uCamPos;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform float uGlobeR;
uniform float uAtmosR;
uniform float uIntensity;
uniform float uFalloff;
varying vec3 vWorldPos;

void main() {
  vec3 rayDir = normalize(vWorldPos - uCamPos);
  vec3 ro = uCamPos;

  float b = dot(ro, rayDir);
  float c = dot(ro, ro);
  float closestDist = sqrt(max(c - b * b, 0.0));

  float disc = b * b - (c - uGlobeR * uGlobeR);
  if (disc > 0.0 && -b - sqrt(disc) > 0.0) discard;

  float edgeDist = closestDist - uGlobeR;
  float thickness = uAtmosR - uGlobeR;
  float t = clamp(edgeDist / thickness, 0.0, 1.0);

  float glow = exp(-t * uFalloff) * (1.0 - t * t);
  glow *= uIntensity;

  vec3 col = mix(uColorInner, uColorOuter, t);

  gl_FragColor = vec4(col, glow);
}
