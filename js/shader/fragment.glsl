uniform float time;
uniform float progress;
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform vec4 resolution;
varying vec2 vUv;

vec2 mirrored(vec2 v){
    vec2 m = mod(v, 2.0);
    return mix(m, 2.0 - m, step(1.0, m));
}

float tri(float p){
    return mix(p, 1.0 - p, step(0.5, p)) * 2.0;
}

void main() {
    // Simple vertical wipe transition
    vec4 t0 = texture2D(uTexture1, vUv);
    vec4 t1 = texture2D(uTexture2, vUv);
    float sweep = step(vUv.y, progress);
    vec4 finalTexture = mix(t0, t1, sweep);

    gl_FragColor = finalTexture;

    float p = progress;
    float accel = 0.0; // Set to desired acceleration if needed

    float delayValue = clamp(p * 7.0 - vUv.y * 2.0 + vUv.x - 2.0, 0.0, 1.0);
    vec2 translateValue = vec2(p + delayValue * accel);

    vec2 w = sin(sin(time) * vec2(0.0, 0.3) + vUv.yx * vec2(0.0, 4.0)) * vec2(0.0, 0.5);
    vec2 xy = w * (tri(p) * 0.5 + tri(delayValue) * 0.5);

    vec2 uv1 = vUv + translateValue + xy;
    vec2 uv2 = vUv + translateValue + xy;

    vec4 rgba1 = texture2D(uTexture1, mirrored(uv1));
    vec4 rgba2 = texture2D(uTexture2, mirrored(uv2));

    vec4 rgba = mix(rgba1, rgba2, delayValue);
    gl_FragColor = rgba;
}


// uniform float time;
// uniform float progress;
// uniform sampler2D uTexture1;
// uniform sampler2D uTexture2;
// uniform vec4 resolution;
// varying vec2 vUv;

// vec2 mirrored(vec2 v) {
//     vec2 m = mod(v, 2.0);
//     return mix(m, 2.0 - m, step(1.0, m));
// }

// float tri(float p) {
//     return mix(p, 1.0 - p, step(0.5, p)) * 2.0;
// }

// // Easing functions for smoother transitions
// float easeInOut(float t) {
//     return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
// }

// float easeInOutCubic(float t) {
//     return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
// }

// float easeInOutQuart(float t) {
//     return t < 0.5 ? 8.0 * t * t * t * t : 1.0 - 8.0 * (--t) * t * t * t;
// }

// float easeInOutBack(float t) {
//     float c1 = 1.70158;
//     float c2 = c1 * 1.525;
//     return t < 0.5
//         ? (pow(2.0 * t, 2.0) * ((c2 + 1.0) * 2.0 * t - c2)) / 2.0
//         : (pow(2.0 * t - 2.0, 2.0) * ((c2 + 1.0) * (t * 2.0 - 2.0) + c2) + 2.0) / 2.0;
// }

// // Smooth step with custom curve
// float smootherStep(float edge0, float edge1, float x) {
//     x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
//     return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
// }

// // Noise function for organic movement
// float noise(vec2 st) {
//     return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
// }

// // Smooth noise
// float smoothNoise(vec2 st) {
//     vec2 i = floor(st);
//     vec2 f = fract(st);
    
//     float a = noise(i);
//     float b = noise(i + vec2(1.0, 0.0));
//     float c = noise(i + vec2(0.0, 1.0));
//     float d = noise(i + vec2(1.0, 1.0));
    
//     vec2 u = f * f * (3.0 - 2.0 * f);
    
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
// }

// void main() {
//     // Apply easing to progress for smoother transitions
//     float easedProgress = easeInOutCubic(progress);
    
//     // Enhanced delay calculation with smoother falloff
//     float delayValue = smootherStep(0.0, 1.0, 
//         easedProgress * 6.0 - vUv.y * 3.0 + vUv.x * 0.5 - 1.5
//     );
    
//     // Smooth acceleration curve
//     float accel = easeInOut(delayValue) * 0.3;
    
//     // Enhanced wave distortion with multiple frequencies
//     vec2 waveTime = time * vec2(0.8, 1.2);
//     vec2 wave1 = sin(waveTime + vUv.yx * vec2(3.0, 5.0)) * vec2(0.02, 0.03);
//     vec2 wave2 = sin(waveTime * 1.5 + vUv.xy * vec2(2.0, 4.0)) * vec2(0.015, 0.025);
//     vec2 wave3 = sin(waveTime * 0.7 + vUv.yx * vec2(1.5, 3.5)) * vec2(0.01, 0.02);
    
//     vec2 totalWave = wave1 + wave2 + wave3;
    
//     // Smooth transition factor
//     float transitionFactor = tri(easedProgress) * 0.6 + tri(delayValue) * 0.4;
    
//     // Apply easing to wave intensity
//     vec2 waveIntensity = totalWave * easeInOut(transitionFactor);
    
//     // Smooth translate value with easing
//     vec2 translateValue = vec2(easedProgress + delayValue * accel) * 0.8;
    
//     // Add subtle noise for organic feel
//     vec2 noiseOffset = vec2(
//         smoothNoise(vUv * 10.0 + time * 0.1),
//         smoothNoise(vUv * 12.0 + time * 0.15)
//     ) * 0.005 * transitionFactor;
    
//     // Calculate UVs with all transformations
//     vec2 uv1 = vUv + translateValue + waveIntensity + noiseOffset;
//     vec2 uv2 = vUv + translateValue + waveIntensity * 1.2 + noiseOffset;
    
//     // Sample textures with mirrored UVs
//     vec4 rgba1 = texture2D(uTexture1, mirrored(uv1));
//     vec4 rgba2 = texture2D(uTexture2, mirrored(uv2));
    
//     // Enhanced mixing with multiple blend modes
//     float mixFactor = easeInOutCubic(delayValue);
    
//     // Color grading for more cinematic look
//     rgba1.rgb = pow(rgba1.rgb, vec3(1.1)); // Slight gamma adjustment
//     rgba2.rgb = pow(rgba2.rgb, vec3(1.1));
    
//     // Smooth color transition
//     vec4 finalColor = mix(rgba1, rgba2, mixFactor);
    
//     // Add subtle vignette effect during transition
//     float vignetteStrength = (1.0 - easedProgress) * easedProgress * 4.0; // Peaks at 0.5
//     float vignette = 1.0 - vignetteStrength * 0.3 * 
//         pow(length(vUv - 0.5), 2.0);
    
//     finalColor.rgb *= vignette;
    
//     // Subtle contrast boost during transition
//     float contrastBoost = 1.0 + vignetteStrength * 0.2;
//     finalColor.rgb = (finalColor.rgb - 0.5) * contrastBoost + 0.5;
    
//     gl_FragColor = finalColor;
// }