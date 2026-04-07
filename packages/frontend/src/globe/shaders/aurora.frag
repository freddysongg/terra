uniform float uKpIntensity;
uniform float uTime;

varying vec3 vLocalPos;

/*
  Aurora bands at high latitudes (60-90 deg N/S).
  uKpIntensity ranges 0.0 (Kp 5) to 1.0 (Kp 9).
  Band width and brightness both scale with intensity.
*/

void main() {
  vec3 norm = normalize(vLocalPos);
  float latitude = asin(clamp(norm.y, -1.0, 1.0));
  float absLat = abs(latitude);

  float minLat = radians(60.0 - uKpIntensity * 15.0);
  float maxLat = radians(90.0);

  float band = smoothstep(minLat, minLat + radians(8.0), absLat)
             * smoothstep(maxLat, maxLat - radians(5.0), absLat);

  float wave = sin(norm.x * 12.0 + uTime * 0.8)
             * sin(norm.z * 10.0 - uTime * 0.5);
  float shimmer = 0.7 + 0.3 * wave;

  float brightness = band * shimmer * (0.3 + 0.7 * uKpIntensity);

  vec3 green = vec3(0.2, 0.9, 0.4);
  vec3 purple = vec3(0.5, 0.15, 0.7);
  float colorMix = smoothstep(radians(75.0), radians(85.0), absLat);
  vec3 color = mix(green, purple, colorMix);

  gl_FragColor = vec4(color, brightness * 0.6);
}
