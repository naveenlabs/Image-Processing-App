// ==================================================
//                IMAGE PROCESSING APP
// ==================================================

/*
In this project, I explored several image processing techniques using a live webcam feed, 
focusing on image thresholding across individual color channels and alternative color spaces. 
When processing the red channel, I observed that thresholding produced results different from 
those of the green and blue channels. The red channel often carried higher intensity values, 
requiring careful calibration to set an appropriate threshold. Red frequently exhibited stronger 
contrast between high and low intensity regions, making the thresholded image appear less noisy 
and more defined. However, in areas dominated by red, thresholding sometimes led to a loss of 
subtle detail, masking gradual intensity changes.

A significant challenge was ensuring that, after increasing brightness by 20% during grayscale 
conversion, no pixel value exceeded 255. Exceeding this limit would have caused artifacts and 
distortions. To address this, I implemented a boundary check within the same loop used for grayscale 
conversion. This straightforward solution brightened the image while clipping pixel values, preserving 
quality without unwanted effects.

Another technical hurdle was integrating real-time face detection and applying filters to detected faces. 
Occasionally, while processing the red channel and applying thresholding, synchronization issues arose 
between live video capture and subsequent processing routines. I resolved these problems by optimizing 
the processing loop and ensuring that pixel operations were efficient. By refining the code structure and 
using object-oriented design, I isolated computationally intensive tasks, reducing latency and improving responsiveness.

Beyond RGB processing, I performed color space conversions using HSV and YCbCr algorithms. These 
alternative representations provided improved segmentation results in thresholding. I found that while 
thresholding in RGB sometimes produced noisy images—especially in the green and blue channels—applying 
thresholding after converting to HSV or YCbCr yielded cleaner, more defined results. This likely stems from 
these color spaces separating luminance from chrominance, allowing for more precise feature isolation without 
interference from color noise.

To further enrich the project, I implemented six distinct extensions that add creative, interactive dimensions. 
The first extension introduces a Glitch/Cyberpunk effect, creating a futuristic look by randomly offsetting pixel 
channels. The second extension involves Hand Gesture Filters, which apply neon or x-ray effects based on detected 
hand movements. The third extension is a Blink Reaction Game that challenges users to blink in response to prompts 
while measuring reaction times. The fourth extension implements Snapchat-Style Filters that overlay fun accessories—such 
as hats, glasses, or masks—onto detected faces. The fifth extension transforms the live feed into a Single-Paddle Pong 
game, with head movement tracked by PoseNet controlling the paddle.

The primary and most innovative extension is the sixth: Hand Keypoints and Emoji Overlay. This extension leverages the 
ml5.js handpose model to track hand movements and detect gestures by analyzing key landmarks like fingertips and the palm 
center. Based on which fingers are extended, the system dynamically computes and overlays an appropriate emoji on the display. 
Calibration was challenging due to variability in hand positions, so I introduced a smoothing algorithm that averages recent 
hand poses, resulting in more stable and reliable gesture recognition.
*/

// ==================================================
//           GLOBAL CONSTANTS & VARIABLES
// ==================================================

let app; // Global application object

// ---------- Canvas & Grid Configuration ----------
const EXT_VIEW_W = 640;
const EXT_VIEW_H = 480;
const HEADLINE_SPACE = 70;
const CELL_W = 160;
const CELL_H = 120;
const MARGIN = 30;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 900;
const GRID_TOTAL_WIDTH = (CELL_W * 3) + (MARGIN * 2);
const GRID_OFFSET_X = (CANVAS_WIDTH - GRID_TOTAL_WIDTH) / 2;
const COL1_X = GRID_OFFSET_X;
const COL2_X = COL1_X + CELL_W + MARGIN;
const COL3_X = COL2_X + CELL_W + MARGIN;
const ROW1_Y = HEADLINE_SPACE + MARGIN;
const ROW2_Y = ROW1_Y + CELL_H + MARGIN;
const ROW3_Y = ROW2_Y + CELL_H + MARGIN;
const ROW4_Y = ROW3_Y + CELL_H + MARGIN;
const ROW5_Y = ROW4_Y + CELL_H + MARGIN;
const sliderBaseY = ROW5_Y + CELL_H + MARGIN + 60;

// ---------- Extension Descriptions ----------
const extensionDescriptions = {
  1: "🔮 Glitch/Cyberpunk:\n• Press 'S' to freeze the frame.\n• Your face gets a futuristic cyber-glitch effect. ⚡\n• Colors shift, pixels distort, and a digital scramble takes over!",
  2: "🤟 Hand Gesture Filters:\n• Thumbs-up 👍🏻 → Neon filter.\n• All fingers extended 🤚🏻 → X-Ray filter.",
  3: "👀 Blink Reaction Game:\n• Press [Space] to start.\n• Wait for 'BLINK NOW!', then blink to stop the timer.\n• Your reaction time is measured in milliseconds (ms).\n• Rankings:\n   ⚡ <200ms → Lightning Reflexes\n   🚀 200-300ms → Super Fast\n   🛏️ 300ms+ → Sleepy? Try Again!",
  4: "😷 Snapchat-Style Filters:\n• Press [H] to toggle a stylish hat. 🎩\n• Press [G] to add cool sunglasses. 🕶️\n• Press [M] to wear a face mask. 😷\n• Mix and match to create fun looks in real-time!",
  5: "🏓 Single-Paddle Pong:\n• Press [P] to start.\n• Move your head (nose) to control the paddle at the bottom.\n• Keep the ball from falling off!",
  6: "🖐 Hand Keypoints + Multiple Emojis:\n• Tracks your hand in real-time with red keypoints. 🔴\n• Recognizes 5 hand gestures and displays matching emojis:\n   👍🏻 Thumbs Up  → Approval / Like\n   👎🏻 Thumbs Down  → Disapproval\n   ✌🏻 Peace Sign  → Victory / Chill\n   🤚🏻 Open Palm  → Stop / High Five\n   🤘🏻 Rock On  → Metal / Fun\n• Try different gestures and watch the emojis appear!"
};

// ==================================================
//           P5.js LIFECYCLE FUNCTIONS
// ==================================================

// ---------- Preload Function ----------
// Loads resources before setup (images, models, etc.)
function preload() {
  app = new App();
  app.preload();
}

// ---------- Setup Function ----------
// Initializes the app and sets up the canvas and UI
function setup() {
  app.setup();
}

// ---------- Draw Function ----------
// Called continuously to render frames
function draw() {
  app.draw();
}

// ---------- Key Press Handler ----------
// Delegates key press events to the App instance
function keyPressed() {
  app.keyPressed();
}

// ==================================================
//                 CLASS DEFINITIONS
// ==================================================

// --------------------------------------------------
//                    App Class
// --------------------------------------------------
// The main class that controls the overall application logic.
class App {
  // -------- Constructor --------
  constructor() {
    this.viewMode = "main";
    this.currentExtension = 1;
    this.captured = false;
    this.snapshot = null;
    this.snapshotHiRes = null;
    this.faceRects = [];
    this.faceDetections = [];
    this.storedFaceDetections = [];
    this.gestureHistory = [];
    this.GESTURE_QUEUE_SIZE = 10;
    this.currentGesture = "none";
    this.predictions = [];
    this.storedHandPredictions = [];
    this.storedEmoji = "";
    this.poses = [];
    this.lastDetectionTime = 0;
    this.blinkGame = new BlinkGame();
    this.pongGame = new PongGame();
  }

  // -------- Preload Resources --------
  // Loads images and other resources required by the app.
  preload() {
    this.hatImg = loadImage("Images/hat.png");
    this.glassesImg = loadImage("Images/glass.png");
    this.maskImg = loadImage("Images/mask.png");
  }

  // -------- Setup App --------
  // Sets up the canvas, video capture, UI elements, and models.
  setup() {
    // Create container div and attach canvas
    let container = createDiv();
    container.id("sketch-container");
    container.style("position", "relative");
    container.style("width", CANVAS_WIDTH + "px");
    container.style("margin", "0 auto");
    
    this.cnv = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.cnv.parent(container);
    frameRate(30);

    // Initialize video capture
    this.video = createCapture(VIDEO);
    this.video.size(320, 240);
    this.video.hide();

    // Create video processor and face detector
    this.videoProcessor = new VideoProcessor(this.video);
    this.detector = new objectdetect.detector(320, 240, 1.2, objectdetect.frontalface);

    // ---------- Initialize UI Sliders ----------
    this.sliderR = createSlider(0, 255, 127);
    this.sliderR.parent(container);
    this.sliderR.style("position", "absolute");
    this.sliderR.position((CANVAS_WIDTH - (4 * 90 + 80)) / 2, sliderBaseY - 30);
    this.sliderR.style("width", "80px");

    this.sliderG = createSlider(0, 255, 127);
    this.sliderG.parent(container);
    this.sliderG.style("position", "absolute");
    this.sliderG.position((CANVAS_WIDTH - (4 * 90 + 80)) / 2 + 90, sliderBaseY - 30);
    this.sliderG.style("width", "80px");

    this.sliderB = createSlider(0, 255, 127);
    this.sliderB.parent(container);
    this.sliderB.style("position", "absolute");
    this.sliderB.position((CANVAS_WIDTH - (4 * 90 + 80)) / 2 + 180, sliderBaseY - 30);
    this.sliderB.style("width", "80px");

    this.sliderC1 = createSlider(0, 255, 127);
    this.sliderC1.parent(container);
    this.sliderC1.style("position", "absolute");
    this.sliderC1.position((CANVAS_WIDTH - (4 * 90 + 80)) / 2 + 270, sliderBaseY - 30);
    this.sliderC1.style("width", "80px");

    this.sliderC2 = createSlider(0, 255, 127);
    this.sliderC2.parent(container);
    this.sliderC2.style("position", "absolute");
    this.sliderC2.position((CANVAS_WIDTH - (4 * 90 + 80)) / 2 + 360, sliderBaseY - 30);
    this.sliderC2.style("width", "80px");

    // ---------- Initialize UI Manager and Grid Views ----------
    this.uiManager = new UIManager(container);
    this.mainGrid = new MainGrid();
    this.extensionsView = new ExtensionsView();

    // ---------- Initialize Handpose Model ----------
    this.handpose = ml5.handpose(this.video, { flipHorizontal: false }, () => {});
    this.handpose.on("predict", results => {
      this.predictions = results;
      HandGesture.detectGesture(results);
    });

    // ---------- Initialize Face API for Blink Detection ----------
    this.faceApiBlink = ml5.faceApi(
      this.video,
      { withLandmarks: true, withExpressions: false, withDescriptors: false },
      () => {
        this.faceApiBlinkReady = true;
      }
    );
    this.faceApiBlinkReady = false;

    // ---------- Initialize PoseNet for Head Tracking ----------
    this.poseNet = ml5.poseNet(this.video, { flipHorizontal: true }, () => {
      this.poseNetReady = true;
    });
    this.poseNetReady = false;
    this.poseNet.on("pose", results => {
      if (results.length > 0) {
        this.poses = [results[0]];
        this.lastDetectionTime = millis();
      }
    });
  }

  // -------- Draw Frame --------
  // Renders the current frame based on whether live video or a snapshot is used.
  draw() {
    background(35);

    // Update face detection if model is ready
    if (this.faceApiBlinkReady) {
      this.faceApiBlink.detect((err, result) => {
        if (!err && result) {
          this.faceDetections = result;
        }
      });
    }

    // Render based on view mode: "main" or "extensions"
    if (this.viewMode === "main") {
      this.uiManager.showMain(true);
      this.uiManager.showExtensions(false);
      this.mainGrid.draw(
        this.videoProcessor,
        this.captured,
        this.snapshot,
        {
          grayBrightImage: this.grayBrightImage,
          redImage: this.redImage,
          greenImage: this.greenImage,
          blueImage: this.blueImage,
          colorSpace1Image: this.colorSpace1Image,
          colorSpace2Image: this.colorSpace2Image,
          faceDetectImage: this.faceDetectImage
        },
        this.faceRects
      );
    } else {
      this.uiManager.showMain(false);
      this.uiManager.showExtensions(true);

      // Reset or initialize extension-specific game states if the extension changes
      if (this.prevExtension !== this.currentExtension) {
        if (this.currentExtension === 3) {
          this.blinkGame.reset();
        } else if (this.currentExtension === 5) {
          this.pongGame.init();
          this.pongGame.gameActive = false;
        }
        this.prevExtension = this.currentExtension;
      }
      this.extensionsView.draw(
        this.videoProcessor,
        this.captured,
        this.snapshotHiRes,
        this.faceDetections,
        this.storedFaceDetections,
        this.predictions,
        this.storedEmoji
      );
    }
  }

  // -------- Key Press Handler --------
  // Handles user interactions via keyboard.
  keyPressed() {
    if (key === ' ') {
      if (this.blinkGame.state === "idle" || this.blinkGame.state === "done") {
        this.blinkGame.start();
      }
    }
    if (key === 's' || key === 'S') {
      this.captureFrame();
    }
    // If a snapshot is captured and a face was detected, apply face filters based on key pressed.
    if (this.captured && this.faceRects.length > 0) {
      let scaleX = CELL_W / 320;
      let scaleY = CELL_H / 240;
      for (let i = 0; i < this.faceRects.length; i++) {
        let r = this.faceRects[i];
        let fx = Math.floor((320 - (r[0] + r[2])) * scaleX);
        let fy = Math.floor(r[1] * scaleY);
        let fw = Math.floor(r[2] * scaleX);
        let fh = Math.floor(r[3] * scaleY);
        if (key === '1') {
          FilterUtils.replaceFaceWithGray(this.snapshot, this.faceDetectImage, fx, fy, fw, fh);
        } else if (key === '2') {
          FilterUtils.replaceFaceWithBlur(this.snapshot, this.faceDetectImage, fx, fy, fw, fh);
        } else if (key === '3') {
          FilterUtils.replaceFaceWithHSV(this.snapshot, this.faceDetectImage, fx, fy, fw, fh);
        } else if (key === '4') {
          FilterUtils.replaceFaceWithPixelate(this.snapshot, this.faceDetectImage, fx, fy, fw, fh);
        }
      }
    }
    if (key === 'h' || key === 'H') {
      this.showHat = !this.showHat;
    }
    if (key === 'g' || key === 'G') {
      this.showGlasses = !this.showGlasses;
    }
    if (key === 'm' || key === 'M') {
      this.showMask = !this.showMask;
    }
    if (key === 'p' || key === 'P') {
      if (this.currentExtension === 5) {
        if (!this.pongGame.gameActive && !this.pongGame.gameOver) {
          this.pongGame.gameActive = true;
        } else if (this.pongGame.gameOver) {
          this.pongGame.init();
          this.pongGame.gameActive = true;
        }
      }
    }
  }

  // -------- Capture Frame --------
  // Captures the current video frame, processes it for various effects,
  // and updates stored snapshots.
  captureFrame() {
    let rawLowRes = this.videoProcessor.getMirroredFrame(CELL_W, CELL_H);
    let rawHighRes = this.videoProcessor.getMirroredFrame(320, 240);

    if (this.viewMode === "extensions" && this.currentExtension === 2) {
      if (this.currentGesture === "neon") {
        let neonLow = FilterUtils.neonOutlineFilter(rawLowRes);
        let neonHigh = FilterUtils.neonOutlineFilter(rawHighRes);
        this.snapshot = neonLow;
        this.snapshotHiRes = neonHigh;
      } else if (this.currentGesture === "xray") {
        let xrayLow = FilterUtils.xRayFilter(rawLowRes);
        let xrayHigh = FilterUtils.xRayFilter(rawHighRes);
        this.snapshot = xrayLow;
        this.snapshotHiRes = xrayHigh;
      } else {
        this.snapshot = rawLowRes;
        this.snapshotHiRes = rawHighRes;
      }
    } else {
      this.snapshot = rawLowRes;
      this.snapshotHiRes = rawHighRes;
    }

    // Detect face(s) in the current frame
    this.faceRects = this.detector.detect(this.video.elt, 1);
    if (this.faceRects && this.faceRects.length > 0) {
      this.faceRects.sort((a, b) => (b[2] * b[3]) - (a[2] * a[3]));
      this.faceRects = [this.faceRects[0]];
    }

    // Process snapshot for different image filters
    this.grayBrightImage = this.snapshot.get();
    this.redImage = this.snapshot.get();
    this.greenImage = this.snapshot.get();
    this.blueImage = this.snapshot.get();

    FilterUtils.processGrayBright(this.grayBrightImage);
    FilterUtils.processRedChannel(this.redImage);
    FilterUtils.processGreenChannel(this.greenImage);
    FilterUtils.processBlueChannel(this.blueImage);

    this.colorSpace1Image = this.snapshot.get();
    this.colorSpace2Image = this.snapshot.get();
    FilterUtils.processColorSpaceYCbCr(this.colorSpace1Image);
    FilterUtils.processColorSpaceHSV(this.colorSpace2Image);

    this.faceDetectImage = this.snapshot.get();

    // Store hand predictions if available
    if (this.predictions && this.predictions.length > 0 && this.predictions[0].annotations) {
      this.storedHandPredictions = this.predictions.slice();
      this.storedEmoji = HandGesture.computeEmoji(this.predictions[0].annotations);
    } else {
      this.storedHandPredictions = [];
      this.storedEmoji = "";
    }
    this.storedFaceDetections = this.faceDetections.slice();
    this.captured = true;
  }

  // -------- Reset PoseNet --------
  // Resets the pose estimation model (useful if no pose detected for some time)
  resetPoseNet() {
    this.poses = [];
    this.poseNetReady = false;
    this.poseNet.removeAllListeners();
    this.poseNet = ml5.poseNet(this.video, { flipHorizontal: true }, () => {
      this.poseNetReady = true;
      this.lastDetectionTime = millis();
    });
    this.poseNet.on("pose", results => {
      if (results.length > 0) {
        this.poses = [results[0]];
        this.lastDetectionTime = millis();
      }
    });
  }
}


// --------------------------------------------------
//                MainGrid Class
// --------------------------------------------------
// Draws the main grid layout containing the live video feed and all processed
// images (e.g., grayscale, thresholded channels, color space conversions, etc.).
class MainGrid {
  // -------- Draw Grid & Content --------
  draw(videoProcessor, captured, snapshot, images, faceRects) {
    // Draw Header
    textAlign(CENTER, BASELINE);
    fill(255);
    textSize(24);
    text("Live Filters + Real-Time Face Detection", width / 2, HEADLINE_SPACE / 2);
    
    // Draw grid cells
    stroke(180);
    strokeWeight(1);
    noFill();
    for (let row = 0; row < 5; row++) {
      let ry = ROW1_Y + row * (CELL_H + MARGIN);
      rect(COL1_X, ry, CELL_W, CELL_H);
      rect(COL2_X, ry, CELL_W, CELL_H);
      rect(COL3_X, ry, CELL_W, CELL_H);
    }
    
    // Draw slider labels
    fill(255);
    noStroke();
    textSize(14);
    this.drawSliderLabels();

    // Draw live video feed or captured snapshot
    if (!captured) {
      // ---------- Live Mode ----------
      let liveFrame = videoProcessor.getMirroredFrame(CELL_W, CELL_H);
      image(liveFrame, COL1_X, ROW1_Y, CELL_W, CELL_H);
      text("Live Webcam (Press 's')", COL1_X, ROW1_Y - 10);

      // ---------- Grayscale + Brightness ----------
      let liveGray = liveFrame.get();
      FilterUtils.processGrayBright(liveGray);
      image(liveGray, COL2_X, ROW1_Y, CELL_W, CELL_H);
      text("Gray+Bright (live)", COL2_X, ROW1_Y - 10);

      // ---------- Color Channels ----------
      let liveRed = liveFrame.get();
      let liveGreen = liveFrame.get();
      let liveBlue = liveFrame.get();

      FilterUtils.processRedChannel(liveRed);
      FilterUtils.processGreenChannel(liveGreen);
      FilterUtils.processBlueChannel(liveBlue);

      image(liveRed, COL1_X, ROW2_Y, CELL_W, CELL_H);
      text("Red (live)", COL1_X, ROW2_Y - 10);
      image(liveGreen, COL2_X, ROW2_Y, CELL_W, CELL_H);
      text("Green (live)", COL2_X, ROW2_Y - 10);
      image(liveBlue, COL3_X, ROW2_Y, CELL_W, CELL_H);
      text("Blue (live)", COL3_X, ROW2_Y - 10);

      // ---------- Threshold Filters on Color Channels ----------
      let liveRedThresh = liveRed.get();
      let liveGreenThresh = liveGreen.get();
      let liveBlueThresh = liveBlue.get();

      FilterUtils.processThresholdChannel(liveRedThresh, app.sliderR.value(), 'R');
      FilterUtils.processThresholdChannel(liveGreenThresh, app.sliderG.value(), 'G');
      FilterUtils.processThresholdChannel(liveBlueThresh, app.sliderB.value(), 'B');

      image(liveRedThresh, COL1_X, ROW3_Y, CELL_W, CELL_H);
      text("Thres(R): " + app.sliderR.value(), COL1_X, ROW3_Y - 10);
      image(liveGreenThresh, COL2_X, ROW3_Y, CELL_W, CELL_H);
      text("Thres(G): " + app.sliderG.value(), COL2_X, ROW3_Y - 10);
      image(liveBlueThresh, COL3_X, ROW3_Y, CELL_W, CELL_H);
      text("Thres(B): " + app.sliderB.value(), COL3_X, ROW3_Y - 10);

      // // ---------- Color Space Conversions ----------
      image(liveFrame, COL1_X, ROW4_Y, CELL_W, CELL_H);
      text("Live repeat", COL1_X, ROW4_Y - 10);

      let liveYCbCr = liveFrame.get();
      let liveHSV = liveFrame.get();

      FilterUtils.processColorSpaceYCbCr(liveYCbCr);
      FilterUtils.processColorSpaceHSV(liveHSV);

      image(liveYCbCr, COL2_X, ROW4_Y, CELL_W, CELL_H);
      text("YCbCr (live)", COL2_X, ROW4_Y - 10);
      image(liveHSV, COL3_X, ROW4_Y, CELL_W, CELL_H);
      text("HSV (live)", COL3_X, ROW4_Y - 10);

      // ---------- Face Detection ----------
      let faceFrame = liveFrame.get();

      image(faceFrame, COL1_X, ROW5_Y, CELL_W, CELL_H);
      text("Face detection (live)", COL1_X, ROW5_Y - 10);
      faceRects = app.detector.detect(app.video.elt, 1);

      if (faceRects && faceRects.length > 0) {
        faceRects.sort((a, b) => (b[2] * b[3]) - (a[2] * a[3]));
        faceRects = [faceRects[0]];
        push();
        noFill();
        stroke(255, 0, 0);
        let scaleX = CELL_W / 320;
        let scaleY = CELL_H / 240;
        let r = faceRects[0];
        let mirroredX = (320 - (r[0] + r[2]));
        rect(COL1_X + mirroredX * scaleX, ROW5_Y + r[1] * scaleY, r[2] * scaleX, r[3] * scaleY);
        pop();
        fill(255);
        text("[Press 's' → freeze, 1..4 face filters]", COL1_X, ROW5_Y + CELL_H + 15);
      } else {
        fill(255);
        text("No face found (live)", COL1_X, ROW5_Y + CELL_H + 15);
      }

      // ---------- Threshold on Color Space Conversions ----------
      let liveYCbCrThresh = liveYCbCr.get();
      let liveHSVThresh = liveHSV.get();

      FilterUtils.processThresholdColorSpaceColor(liveYCbCrThresh, app.sliderC1.value(), "YCbCr");
      FilterUtils.processThresholdColorSpaceColor(liveHSVThresh, app.sliderC2.value(), "HSV");

      image(liveYCbCrThresh, COL2_X, ROW5_Y, CELL_W, CELL_H);
      text("Thres(Y): " + app.sliderC1.value(), COL2_X, ROW5_Y - 10);
      image(liveHSVThresh, COL3_X, ROW5_Y, CELL_W, CELL_H);
      text("Thres(V): " + app.sliderC2.value(), COL3_X, ROW5_Y - 10);
    } else {
      // ---------- Frozen (Captured) Mode ----------

      // ---------- Captured Snapshot ----------
      image(snapshot, COL1_X, ROW1_Y, CELL_W, CELL_H);
      text("Snapshot (frozen)", COL1_X, ROW1_Y - 10);

      // ---------- Processed Snapshot: Grayscale + Brightness ----------
      image(images.grayBrightImage, COL2_X, ROW1_Y, CELL_W, CELL_H);
      text("Grayscale+Bright", COL2_X, ROW1_Y - 10);

      // ---------- Processed Snapshot: Color Channels ---------- 
      image(images.redImage, COL1_X, ROW2_Y, CELL_W, CELL_H);
      text("Red channel", COL1_X, ROW2_Y - 10);
      image(images.greenImage, COL2_X, ROW2_Y, CELL_W, CELL_H);
      text("Green channel", COL2_X, ROW2_Y - 10);
      image(images.blueImage, COL3_X, ROW2_Y, CELL_W, CELL_H);
      text("Blue channel", COL3_X, ROW2_Y - 10);

      // ---------- Processed Threshold Filters on Snapshot's Color Channels ----------
      let redThresh = images.redImage.get();
      let greenThresh = images.greenImage.get();
      let blueThresh = images.blueImage.get();

      FilterUtils.processThresholdChannel(redThresh, app.sliderR.value(), 'R');
      FilterUtils.processThresholdChannel(greenThresh, app.sliderG.value(), 'G');
      FilterUtils.processThresholdChannel(blueThresh, app.sliderB.value(), 'B');

      image(redThresh, COL1_X, ROW3_Y, CELL_W, CELL_H);
      text("Thres(R): " + app.sliderR.value(), COL1_X, ROW3_Y - 10);
      image(greenThresh, COL2_X, ROW3_Y, CELL_W, CELL_H);
      text("Thres(G): " + app.sliderG.value(), COL2_X, ROW3_Y - 10);
      image(blueThresh, COL3_X, ROW3_Y, CELL_W, CELL_H);
      text("Thres(B): " + app.sliderB.value(), COL3_X, ROW3_Y - 10);

      // ---------- Color Space Converted Snapshot ----------
      image(snapshot, COL1_X, ROW4_Y, CELL_W, CELL_H);
      text("Snapshot (repeat)", COL1_X, ROW4_Y - 10);
      image(images.colorSpace1Image, COL2_X, ROW4_Y, CELL_W, CELL_H);
      text("YCbCr", COL2_X, ROW4_Y - 10);
      image(images.colorSpace2Image, COL3_X, ROW4_Y, CELL_W, CELL_H);
      text("HSV", COL3_X, ROW4_Y - 10);

      // ---------- Display Face Detection on Captured Snapshot ----------
      image(images.faceDetectImage, COL1_X, ROW5_Y, CELL_W, CELL_H);
      text("Face detection cell (frozen)", COL1_X, ROW5_Y - 10);
      if (faceRects.length > 0) {
        push();
        noFill();
        stroke(255, 0, 0);
        let scaleX = CELL_W / 320;
        let scaleY = CELL_H / 240;
        let r = faceRects[0];
        let mirroredX = (320 - (r[0] + r[2]));
        rect(COL1_X + mirroredX * scaleX, ROW5_Y + r[1] * scaleY, r[2] * scaleX, r[3] * scaleY);
        pop();
        fill(255);
        text("[1]=Gray, [2]=Blur, [3]=HSV, [4]=Pixelate", COL1_X, ROW5_Y + CELL_H + 15);
      } else {
        fill(255);
        text("No face bounding box from last detection", COL1_X, ROW5_Y + CELL_H + 15);
      }

      // ---------- Threshold Filters on Color Space Converted Snapshot ----------
      let cs1Thresh = images.colorSpace1Image.get();
      FilterUtils.processThresholdColorSpaceColor(cs1Thresh, app.sliderC1.value(), "YCbCr");
      image(cs1Thresh, COL2_X, ROW5_Y, CELL_W, CELL_H);
      text("Thres(Y): " + app.sliderC1.value(), COL2_X, ROW5_Y - 10);
      
      let cs2Thresh = images.colorSpace2Image.get();
      FilterUtils.processThresholdColorSpaceColor(cs2Thresh, app.sliderC2.value(), "HSV");
      image(cs2Thresh, COL3_X, ROW5_Y, CELL_W, CELL_H);
      text("Thres(V): " + app.sliderC2.value(), COL3_X, ROW5_Y - 10);
    }
  }

  // -------- Draw Slider Labels --------
  drawSliderLabels() {
    textAlign(LEFT, BASELINE);
    fill(255);
    noStroke();
    textSize(13);
    let labelY = sliderBaseY - 50;
    text("Thresh(R)", COL1_X + 60, labelY);
    text("Thresh(G)", COL1_X + 150, labelY);
    text("Thresh(B)", COL1_X + 240, labelY);
    text("Thresh(YCbCr)", COL1_X + 320, labelY);
    text("Thresh(HSV)", COL1_X + 420, labelY);
  }
}


// --------------------------------------------------
//               VideoProcessor Class
// --------------------------------------------------
// Provides a method to obtain a horizontally mirrored frame from the webcam.
class VideoProcessor {
  constructor(video) {
    this.video = video;
  }

  getMirroredFrame(w, h) {
    let pg = createGraphics(w, h);
    pg.push();
    pg.translate(w, 0);
    pg.scale(-1, 1);
    pg.image(this.video, 0, 0, w, h);
    pg.pop();
    return pg.get();
  }
}


// --------------------------------------------------
//               FilterUtils Class
// --------------------------------------------------
// Contains static methods for processing images including converting to
// grayscale, splitting color channels, applying thresholding, color space
// conversions, and custom filters such as glitch and neon effects.
class FilterUtils {
  // -------- Grayscale & Brightness Increase --------
  static processGrayBright(img) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let r = img.pixels[i], g = img.pixels[i + 1], b = img.pixels[i + 2];
      let gray = 0.3 * r + 0.59 * g + 0.11 * b;
      gray = gray * 1.2;
      if (gray > 255) gray = 255;
      img.pixels[i] = gray;
      img.pixels[i + 1] = gray;
      img.pixels[i + 2] = gray;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  // -------- Process Individual Color Channels --------
  static processRedChannel(img) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      img.pixels[i + 1] = 0;
      img.pixels[i + 2] = 0;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  static processGreenChannel(img) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      img.pixels[i] = 0;
      img.pixels[i + 2] = 0;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  static processBlueChannel(img) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      img.pixels[i] = 0;
      img.pixels[i + 1] = 0;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  // -------- Thresholding for Individual Channels --------
  static processThresholdChannel(img, val, chan) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      if (chan === 'R') {
        let r = img.pixels[i];
        img.pixels[i] = (r > val) ? 255 : 0;
        img.pixels[i + 1] = 0;
        img.pixels[i + 2] = 0;
      } else if (chan === 'G') {
        let g = img.pixels[i + 1];
        img.pixels[i] = 0;
        img.pixels[i + 1] = (g > val) ? 255 : 0;
        img.pixels[i + 2] = 0;
      } else {
        let b = img.pixels[i + 2];
        img.pixels[i] = 0;
        img.pixels[i + 1] = 0;
        img.pixels[i + 2] = (b > val) ? 255 : 0;
      }
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  // -------- Color Space Conversions --------
  static processColorSpaceYCbCr(img) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let R = img.pixels[i], G = img.pixels[i + 1], B = img.pixels[i + 2];
      let Y = 0.299 * R + 0.587 * G + 0.114 * B;
      let Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
      let Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
      Y = constrain(round(Y), 0, 255);
      Cb = constrain(round(Cb), 0, 255);
      Cr = constrain(round(Cr), 0, 255);
      img.pixels[i] = Y;
      img.pixels[i + 1] = Cb;
      img.pixels[i + 2] = Cr;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  static processColorSpaceHSV(img) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let R = img.pixels[i] / 255, G = img.pixels[i + 1] / 255, B = img.pixels[i + 2] / 255;
      let maxVal = max(R, G, B);
      let minVal = min(R, G, B);
      let delta = maxVal - minVal;
      let V = maxVal;
      let S = (maxVal === 0) ? 0 : (delta / maxVal);
      let H = 0;
      if (delta !== 0) {
        if (maxVal === R) H = 60 * (((G - B) / delta) % 6);
        else if (maxVal === G) H = 60 * (((B - R) / delta) + 2);
        else H = 60 * (((R - G) / delta) + 4);
        if (H < 0) H += 360;
      }
      let H8 = constrain(round(H / 360 * 255), 0, 255);
      let S8 = constrain(round(S * 255), 0, 255);
      let V8 = constrain(round(V * 255), 0, 255);
      img.pixels[i] = H8;
      img.pixels[i + 1] = S8;
      img.pixels[i + 2] = V8;
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  // -------- Thresholding on Color Space Images --------
  static processThresholdColorSpaceColor(img, val, space) {
    img.loadPixels();
    for (let i = 0; i < img.pixels.length; i += 4) {
      let comp = (space === "YCbCr") ? img.pixels[i] : img.pixels[i + 2];
      if (comp <= val) {
        img.pixels[i] = 0;
        img.pixels[i + 1] = 0;
        img.pixels[i + 2] = 0;
      }
      img.pixels[i + 3] = 255;
    }
    img.updatePixels();
  }

  // -------- Face Replacement Filters --------

  // -------- Replace Face with Grayscale --------
  static replaceFaceWithGray(src, dest, x, y, w, h) {
    let subImg = createImage(w, h);
    subImg.copy(src, x, y, w, h, 0, 0, w, h);
    subImg.loadPixels();
    for (let i = 0; i < subImg.pixels.length; i += 4) {
      let r = subImg.pixels[i], g = subImg.pixels[i + 1], b = subImg.pixels[i + 2];
      let gray = 0.3 * r + 0.59 * g + 0.11 * b;
      subImg.pixels[i] = gray;
      subImg.pixels[i + 1] = gray;
      subImg.pixels[i + 2] = gray;
      subImg.pixels[i + 3] = 255;
    }
    subImg.updatePixels();
    dest.copy(subImg, 0, 0, w, h, x, y, w, h);
  }

  // -------- Replace Face with Blur --------
  static replaceFaceWithBlur(src, dest, x, y, w, h) {
    let subImg = createImage(w, h);
    subImg.copy(src, x, y, w, h, 0, 0, w, h);
    let pg = createGraphics(w, h);
    pg.image(subImg, 0, 0, w, h);
    pg.filter(BLUR, 3);
    pg.filter(BLUR, 3);
    pg.filter(BLUR, 3);
    subImg = pg.get();
    dest.copy(subImg, 0, 0, w, h, x, y, w, h);
  }

  // -------- Replace Face with HSV Conversion --------
  static replaceFaceWithHSV(src, dest, x, y, w, h) {
    let subImg = createImage(w, h);
    subImg.copy(src, x, y, w, h, 0, 0, w, h);
    subImg.loadPixels();
    for (let i = 0; i < subImg.pixels.length; i += 4) {
      let R = subImg.pixels[i] / 255, G = subImg.pixels[i + 1] / 255, B = subImg.pixels[i + 2] / 255;
      let maxVal = max(R, G, B), minVal = min(R, G, B);
      let delta = maxVal - minVal;
      let V = maxVal;
      let S = (maxVal === 0) ? 0 : (delta / maxVal);
      let H = 0;
      if (delta !== 0) {
        if (maxVal === R) H = 60 * (((G - B) / delta) % 6);
        else if (maxVal === G) H = 60 * (((B - R) / delta) + 2);
        else H = 60 * (((R - G) / delta) + 4);
        if (H < 0) H += 360;
      }
      let H8 = constrain(round(H / 360 * 255), 0, 255);
      let S8 = constrain(round(S * 255), 0, 255);
      let V8 = constrain(round(V * 255), 0, 255);
      subImg.pixels[i] = H8;
      subImg.pixels[i + 1] = S8;
      subImg.pixels[i + 2] = V8;
      subImg.pixels[i + 3] = 255;
    }
    subImg.updatePixels();
    dest.copy(subImg, 0, 0, w, h, x, y, w, h);
  }

  // -------- Replace Face with Pixelation --------
  static replaceFaceWithPixelate(src, dest, x, y, w, h) {
    let subImg = createImage(w, h);
    subImg.copy(src, x, y, w, h, 0, 0, w, h);
    subImg.loadPixels();
    // Convert to grayscale first
    for (let i = 0; i < subImg.pixels.length; i += 4) {
      let r = subImg.pixels[i], g = subImg.pixels[i + 1], b = subImg.pixels[i + 2];
      let gray = 0.3 * r + 0.59 * g + 0.11 * b;
      subImg.pixels[i] = gray;
      subImg.pixels[i + 1] = gray;
      subImg.pixels[i + 2] = gray;
      subImg.pixels[i + 3] = 255;
    }
    subImg.updatePixels();

    // Pixelate by averaging blocks of pixels
    let blockSize = 5;
    for (let row = 0; row < h; row += blockSize) {
      for (let col = 0; col < w; col += blockSize) {
        let sum = 0, count = 0;
        for (let rr = 0; rr < blockSize; rr++) {
          for (let cc = 0; cc < blockSize; cc++) {
            let rPix = row + rr, cPix = col + cc;
            if (rPix < h && cPix < w) {
              let idx = 4 * (rPix * w + cPix);
              sum += subImg.pixels[idx];
              count++;
            }
          }
        }
        let avg = (count > 0) ? sum / count : 0;
        for (let rr = 0; rr < blockSize; rr++) {
          for (let cc = 0; cc < blockSize; cc++) {
            let rPix = row + rr, cPix = col + cc;
            if (rPix < h && cPix < w) {
              let idx = 4 * (rPix * w + cPix);
              subImg.pixels[idx] = avg;
              subImg.pixels[idx + 1] = avg;
              subImg.pixels[idx + 2] = avg;
              subImg.pixels[idx + 3] = 255;
            }
          }
        }
      }
    }
    subImg.updatePixels();
    dest.copy(subImg, 0, 0, w, h, x, y, w, h);
  }

  // -------- Glitch Effect (Extension 1) --------
  static glitchEffect(src, faceRects) {
    let w = src.width, h = src.height;
    let base = src.get();
    base.loadPixels();
    let rOffsetX = floor(random(-5, 5)), rOffsetY = floor(random(-5, 5));
    let gOffsetX = floor(random(-5, 5)), gOffsetY = floor(random(-5, 5));
    let bOffsetX = floor(random(-5, 5)), bOffsetY = floor(random(-5, 5));
    let output = createImage(w, h);
    output.loadPixels();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let idx = 4 * (y * w + x);
        let xr = constrain(x - rOffsetX, 0, w - 1);
        let yr = constrain(y - rOffsetY, 0, h - 1);
        let xg = constrain(x - gOffsetX, 0, w - 1);
        let yg = constrain(y - gOffsetY, 0, h - 1);
        let xb = constrain(x - bOffsetX, 0, w - 1);
        let yb = constrain(y - bOffsetY, 0, h - 1);
        let idxR = 4 * (yr * w + xr);
        let idxG = 4 * (yg * w + xg);
        let idxB = 4 * (yb * w + xb);
        output.pixels[idx] = base.pixels[idxR];
        output.pixels[idx + 1] = base.pixels[idxG + 1];
        output.pixels[idx + 2] = base.pixels[idxB + 2];
        output.pixels[idx + 3] = 255;
      }
    }
    output.updatePixels();

    // Apply localized glitch effect on detected face area if available
    if (faceRects && faceRects.length > 0) {
      let r = faceRects[0];
      let scaleX = w / 320, scaleY = h / 240;
      let faceX = floor((320 - (r[0] + r[2])) * scaleX);
      let faceY = floor(r[1] * scaleY);
      let faceW = floor(r[2] * scaleX);
      let faceH = floor(r[3] * scaleY);
      output.loadPixels();
      for (let yy = faceY; yy < faceY + faceH; yy++) {
        for (let xx = faceX; xx < faceX + faceW; xx++) {
          if (random() < 0.1) {
            let dx = floor(random(-10, 10)), dy = floor(random(-10, 10));
            let newX = constrain(xx + dx, faceX, faceX + faceW - 1);
            let newY = constrain(yy + dy, faceY, faceY + faceH - 1);
            let idx = 4 * (yy * w + xx);
            let idxNew = 4 * (newY * w + newX);
            for (let c = 0; c < 4; c++) {
              let temp = output.pixels[idx + c];
              output.pixels[idx + c] = output.pixels[idxNew + c];
              output.pixels[idxNew + c] = temp;
            }
          }
        }
      }
      output.updatePixels();
    }
    return output;
  }

  // -------- Neon Outline Filter (Extension 2) --------
  static neonOutlineFilter(src) {
    let w = src.width, h = src.height;
    let input = src.get();
    input.loadPixels();
    let output = createImage(w, h);
    output.loadPixels();
    let threshold = 30;
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        let idx = 4 * (y * w + x);
        let idxR = 4 * (y * w + (x + 1));
        let idxB = 4 * ((y + 1) * w + x);
        let r = input.pixels[idx], g = input.pixels[idx + 1], b = input.pixels[idx + 2];
        let rR = input.pixels[idxR], gR = input.pixels[idxR + 1], bR = input.pixels[idxR + 2];
        let rB = input.pixels[idxB], gB = input.pixels[idxB + 1], bB = input.pixels[idxB + 2];
        let current = (r + g + b) / 3;
        let right = (rR + gR + bR) / 3;
        let below = (rB + gB + bB) / 3;
        let diff = abs(current - right) + abs(current - below);
        if (diff > threshold) {
          output.pixels[idx] = 255;
          output.pixels[idx + 1] = 0;
          output.pixels[idx + 2] = 255;
          output.pixels[idx + 3] = 255;
        } else {
          output.pixels[idx] = 0;
          output.pixels[idx + 1] = 0;
          output.pixels[idx + 2] = 0;
          output.pixels[idx + 3] = 255;
        }
      }
    }
    output.updatePixels();
    return output;
  }

  // -------- X-Ray Filter (Extension 2) --------
  static xRayFilter(src) {
    let input = src.get();
    input.loadPixels();
    for (let i = 0; i < input.pixels.length; i += 4) {
      let r = input.pixels[i], g = input.pixels[i + 1], b = input.pixels[i + 2];
      let nr = 255 - r, ng = 255 - g, nb = 255 - b;
      nr *= 0.6;
      ng *= 0.6;
      nb = min(nb + 40, 255);
      input.pixels[i] = nr;
      input.pixels[i + 1] = ng;
      input.pixels[i + 2] = nb;
      input.pixels[i + 3] = 255;
    }
    input.updatePixels();
    return input;
  }
}


// --------------------------------------------------
//                UIManager Class
// --------------------------------------------------
// Manages UI elements (buttons, sliders) and their visibility
class UIManager {
  // -------- Constructor --------
  constructor(container) {
    this.container = container;
    // ---------- Button: Capture Frame ----------
    this.btnCapture = createButton("Capture Frame");
    this.btnCapture.parent(container);
    this.btnCapture.style("position", "absolute");
    this.btnCapture.position(820, 60);
    this.btnCapture.mousePressed(() => {
      app.captureFrame();
    });

    // ---------- Button: Return to Live ----------
    this.btnLive = createButton("Return to Live");
    this.btnLive.parent(container);
    this.btnLive.style("position", "absolute");
    this.btnLive.position(820, 100);
    this.btnLive.mousePressed(() => {
      app.captured = false;
    });

    // ---------- Button: Save Image ----------
    this.btnSave = createButton("Save Image");
    this.btnSave.parent(container);
    this.btnSave.style("position", "absolute");
    this.btnSave.position(820, 140);
    this.btnSave.mousePressed(() => {
      if (app.captured) saveCanvas(app.cnv, "layout", "png");
      else alert("Please capture a frame first before saving the image.");
    });

    // ---------- Button: Extensions ----------
    this.btnExtensions = createButton("Extensions");
    this.btnExtensions.parent(container);
    this.btnExtensions.style("position", "absolute");
    this.btnExtensions.position(30, 60);
    this.btnExtensions.mousePressed(() => {
      app.viewMode = "extensions";
      app.currentExtension = 1;
    });

    // ---------- Button: Back to Main ----------
    this.btnBackToMain = createButton("Back to Main");
    this.btnBackToMain.parent(container);
    this.btnBackToMain.style("position", "absolute");
    this.btnBackToMain.position(30, 100);
    this.btnBackToMain.hide();
    this.btnBackToMain.mousePressed(() => {
      app.viewMode = "main";
    });

    // ---------- Extension Buttons ----------
    this.extensionButtons = [];
    for (let i = 1; i <= 6; i++) {
      let b = createButton("Extension " + i);
      b.parent(container);
      b.style("position", "absolute");
      b.position(30, 210 + (i - 1) * 30);
      b.hide();
      b.mousePressed(() => {
        app.currentExtension = i;
      });
      this.extensionButtons.push(b);
    }
    this.showMain(true);
  }

  // -------- Show Main UI Elements --------
  showMain(show) {
    let disp = show ? 'block' : 'none';
    app.sliderR.style('display', disp);
    app.sliderG.style('display', disp);
    app.sliderB.style('display', disp);
    app.sliderC1.style('display', disp);
    app.sliderC2.style('display', disp);
  }

  // -------- Show Extensions UI Elements --------
  showExtensions(show) {
    if (show) {
      this.btnBackToMain.show();
      this.extensionButtons.forEach(b => b.show());
    } else {
      this.btnBackToMain.hide();
      this.extensionButtons.forEach(b => b.hide());
    }
  }
}
 