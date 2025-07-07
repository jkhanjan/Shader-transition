import * as THREE from "three";
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import GUI from "lil-gui";
import { TimelineMax } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import green from "../green.avif";
import blue from "../bluish.jpg";
import orange from "../orange.jpg";
import bg from "../bg.jpg";
import bg2 from "../bg2.jpg";
import bg3 from "../bg3.jpg";
import { Lethargy } from "lethargy";
import { WheelGesture } from "@use-gesture/vanilla";
import virtualscroll from "virtual-scroll";
import VirtualScroll from "virtual-scroll";

export default class Sketch {
  constructor(options) {
    this.current = 0;
    this.scenes = [
      {
        bg: bg,
        matcap: green,
        geometry: new THREE.BoxGeometry(0.15, 0.15, 0.15),
      },
      {
        bg: bg2,
        matcap: blue,
        geometry: new THREE.BoxGeometry(0.15, 0.15, 0.15),
      },
      {
        bg: bg3,
        matcap: orange,
        geometry: new THREE.BoxGeometry(0.15, 0.15, 0.15),
      },
    ];

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1);

    this.container = document.getElementById("container");
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.001,
      1000
    );

    this.scenes.forEach((o, index) => {
      o.scene = this.createScene(o.bg, o.matcap, o.geometry);
      this.renderer.compile(o.scene, this.camera);
      o.target = new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false,
      });
    });

    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Disable zoom on scroll to prevent conflicts
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;

    this.time = 0;
    this.paused = false;

    // Fixed scroll state management
    this.scrollState = 0;
    this.targetScrollState = 0;
    this.scrollSpeed = 0.02; // Smooth transition speed

    this.scroller = new VirtualScroll({
      mouseMultiplier: 1,
      touchMultiplier: 2,
      firefoxMultiplier: 15,
      keyStep: 120,
      preventTouch: false,
      unpreventTouchClass: "vs-touchmove-allowed",
      limitInertia: false,
      useKeyboard: true,
      useTouch: true,
    });

    this.scroller.on((event) => {
      // Prevent default scroll behavior on the container
      event.originalEvent && event.originalEvent.preventDefault();

      // Only use scroll for scene transition, not camera
      this.targetScrollState += event.deltaY / 2000;
      // Clamp between 0 and scenes.length - 1
      this.targetScrollState = Math.max(
        0,
        Math.min(this.scenes.length - 1, this.targetScrollState)
      );
    });

    // Prevent wheel events from affecting OrbitControls
    this.container.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
      },
      { passive: false }
    );

    this.settings();
    this.setupResize();
    this.initPost();
    this.resize();
    this.render();
    this.lethargy = new Lethargy();
  }

  settings() {
    this.settings = {
      time: 0,
      progress: 0,
      scrollSpeed: 0.02,
      debugScroll: false,
      enableOrbitZoom: true,
      enableOrbitPan: true,
      enableOrbitRotate: true,
    };
    this.gui = new GUI();
    this.gui.add(this.settings, "time", 0, 100, 0.01);
    this.gui.add(this.settings, "progress", 0, 1, 0.01);
    this.gui
      .add(this.settings, "scrollSpeed", 0.001, 0.1, 0.001)
      .onChange((value) => {
        this.scrollSpeed = value;
      });
    this.gui.add(this.settings, "debugScroll");

    // OrbitControls settings
    this.gui.add(this.settings, "enableOrbitZoom").onChange((value) => {
      this.controls.enableZoom = value;
    });
    this.gui.add(this.settings, "enableOrbitPan").onChange((value) => {
      this.controls.enablePan = value;
    });
    this.gui.add(this.settings, "enableOrbitRotate").onChange((value) => {
      this.controls.enableRotate = value;
    });
  }

  initPost() {
    this.postScene = new THREE.Scene();
    let frustumSize = 1;
    let aspect = 1;
    this.postCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -1000,
      1000
    );

    // Create initial render targets to avoid null textures
    this.scenes.forEach((scene) => {
      this.renderer.setRenderTarget(scene.target);
      this.renderer.render(scene.scene, this.camera);
    });
    this.renderer.setRenderTarget(null);

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        progress: { value: 0 },
        uTexture1: { value: this.scenes[0].target.texture },
        uTexture2: { value: this.scenes[1].target.texture },
        time: { value: 0 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.postScene.add(this.quad);
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    // Resize render targets
    this.scenes.forEach((scene) => {
      scene.target.setSize(this.width, this.height);
    });

    // Image cover calculation
    this.imageAspect = 853 / 1280;
    let a1, a2;
    if (this.height / this.width > this.imageAspect) {
      a1 = (this.width / this.height) * this.imageAspect;
      a2 = 1;
    } else {
      a1 = 1;
      a2 = this.height / this.width / this.imageAspect;
    }

    this.camera.updateProjectionMatrix();
  }

  createScene(background, matcap, geometry) {
    let scene = new THREE.Scene();
    let bgTexture = new THREE.TextureLoader().load(background);
    scene.background = bgTexture;

    let material = new THREE.MeshMatcapMaterial({
      matcap: new THREE.TextureLoader().load(matcap),
    });

    let mesh = new THREE.Mesh(geometry, material);

    // Create instanced geometry for better performance
    for (let i = 0; i < 120; i++) {
      let random = new THREE.Vector3().randomDirection();
      let clone = mesh.clone();
      clone.position.copy(random);
      clone.rotation.x = Math.random() * Math.PI * 2;
      clone.rotation.y = Math.random() * Math.PI * 2;
      clone.rotation.z = Math.random() * Math.PI * 2;
      // Ensure consistent scale
      clone.scale.setScalar(1);
      scene.add(clone);
    }
    return scene;
  }

  updateScrollState() {
    // Smooth interpolation between current and target scroll state
    this.scrollState +=
      (this.targetScrollState - this.scrollState) * this.scrollSpeed;

    // Calculate current scene indices
    this.current = Math.floor(this.scrollState);
    this.next = Math.min(this.current + 1, this.scenes.length - 1);

    // Calculate progress between scenes
    this.progress = this.scrollState - this.current;

    // Handle edge case when at last scene
    if (this.current >= this.scenes.length - 1) {
      this.current = this.scenes.length - 1;
      this.next = this.scenes.length - 1;
      this.progress = 0;
    }

    // Debug logging
    if (this.settings.debugScroll) {
      console.log({
        scrollState: this.scrollState.toFixed(3),
        current: this.current,
        next: this.next,
        progress: this.progress.toFixed(3),
      });
    }
  }

  stop() {
    this.paused = true;
  }

  play() {
    this.paused = false;
    this.render();
  }

  render() {
    if (this.paused) return;

    this.time += 0.05;
    this.updateScrollState();

    // Update camera controls
    this.controls.update();

    // Animate scenes rotation
    this.scenes.forEach((o) => {
      o.scene.rotation.y = this.time * 0.1;
    });

    // Render current scene to its target
    this.renderer.setRenderTarget(this.scenes[this.current].target);
    this.renderer.render(this.scenes[this.current].scene, this.camera);

    // Render next scene to its target (only if different from current)
    if (this.next !== this.current) {
      this.renderer.setRenderTarget(this.scenes[this.next].target);
      this.renderer.render(this.scenes[this.next].scene, this.camera);
    }

    // Reset render target and render post-processing
    this.renderer.setRenderTarget(null);

    // Update material uniforms with render target textures
    this.material.uniforms.uTexture1.value =
      this.scenes[this.current].target.texture;
    this.material.uniforms.uTexture2.value =
      this.scenes[this.next].target.texture;

    // Use the calculated progress instead of settings progress
    this.material.uniforms.progress.value = this.progress;
    this.material.uniforms.time.value = this.time;

    // Update settings for GUI display
    this.settings.progress = this.progress;

    // Render the post-processing scene
    this.renderer.render(this.postScene, this.postCamera);

    requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch("container");
