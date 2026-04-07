uniform sampler2D uNightMap;
uniform sampler2D uTopoMap;
uniform sampler2D uOceanMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vec4 tex = texture2D(uNightMap, vUv);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float topo = texture2D(uTopoMap, vUv).r;

  // land/ocean threshold
  float isLand = smoothstep(0.004, 0.02, topo);

  // ocean: dark navy from pre-painted map
  vec3 oceanColor = texture2D(uOceanMap, vUv).rgb;

  // land: very dark navy, barely distinguishable from ocean
  vec3 landBase = vec3(0.014, 0.025, 0.060);
  vec3 landMid  = vec3(0.018, 0.030, 0.072);
  vec3 landHigh = vec3(0.024, 0.038, 0.085);
  float elev = smoothstep(0.02, 0.25, topo);
  float mount = smoothstep(0.15, 0.55, topo);
  vec3 landColor = mix(landBase, landMid, elev);
  landColor = mix(landColor, landHigh, mount);

  vec3 base = mix(landColor, oceanColor, isLand);

  // coastline: thin subtle cyan edge
  float coastInner = smoothstep(0.006, 0.012, topo) * (1.0 - smoothstep(0.014, 0.020, topo));
  float coastOuter = smoothstep(0.003, 0.007, topo) * (1.0 - smoothstep(0.016, 0.025, topo));
  vec3 coastColor = vec3(0.25, 0.55, 0.78);
  base += coastColor * coastInner * 0.07;
  base += coastColor * coastOuter * 0.03;

  // city lights: warm golden-white
  float isCity = smoothstep(0.04, 0.14, lum);
  float cityBright = mix(0.4, 1.0, smoothstep(0.08, 0.5, lum));
  vec3 cityWarm = vec3(1.0, 0.82, 0.50);
  vec3 cityCool = vec3(1.0, 0.90, 0.72);
  vec3 cityTint = mix(cityWarm, cityCool, smoothstep(0.1, 0.4, lum));
  vec3 cityColor = cityTint * isCity * cityBright * 1.6;

  // subtle rim lighting for depth
  vec3 viewDir = normalize(-vViewPos);
  float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
  base += vec3(0.008, 0.014, 0.028) * pow(rim, 2.5);

  gl_FragColor = vec4(base + cityColor, 1.0);
}
