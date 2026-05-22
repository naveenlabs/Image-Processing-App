// ==================================================
//              EXTENSIONS VIEW & SUPPORT CLASSES
// ==================================================

// --------------------------------------------------
//                 ExtensionsView Class
// --------------------------------------------------
// This class is responsible for rendering the extensions view,
// which displays creative effects and interactive games. Depending
// on the current extension selected by the user, a different effect
// is applied to the live video or snapshot.

class ExtensionsView {
    // -------- Draw the Extensions View --------
    draw(videoProcessor, captured, snapshotHiRes, faceDetections, storedFaceDetections, predictions, storedEmoji) {
      // ---------- Compute Position & Extension Title ----------
      let camX = (CANVAS_WIDTH - EXT_VIEW_W) / 2;
      let camY = (CANVAS_HEIGHT - EXT_VIEW_H) / 2;
      let extensionTitle = "";
      switch (app.currentExtension) {
        case 1: extensionTitle = "Glitch/Cyberpunk"; break;
        case 2: extensionTitle = "Hand Gesture Filters"; break;
        case 3: extensionTitle = "Blink Reaction Game"; break;
        case 4: extensionTitle = "Snapchat-Style Filters"; break;t
        case 5: extensionTitle = "Single-Paddle Pong"; break;
        case 6: extensionTitle = "Hand Keypoints + Multiple Emojis"; break;
      }
  
      // ---------- Draw Extension Header ----------
      textAlign(CENTER, TOP);
      fill(255);
      textSize(18);
      noStroke();
      text("Extension " + app.currentExtension + ":  " + extensionTitle, width / 2, camY - 40);
  
      // ---------- Select Frame to Use ----------
      // Use the high resolution snapshot if captured, otherwise use live frame.
      let frameToUse = captured ? snapshotHiRes.get() : videoProcessor.getMirroredFrame(320, 240);
  
      // ---------- Draw Frame Container ----------
      stroke(255);
      strokeWeight(3);
      noFill();
      image(frameToUse, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
      rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
  
      // ---------- Apply Extension-Specific Effects ----------
      switch (app.currentExtension) {
        case 1:
          // Glitch/Cyberpunk effect
          let glitchImg = FilterUtils.glitchEffect(frameToUse, app.faceRects);
          image(glitchImg, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          break;
  
        case 2:
          // Hand Gesture Filters: Neon or X-Ray filter based on gesture
          let gestureImg = (app.currentGesture === "neon" || app.currentGesture === "xray")
            ? (app.currentGesture === "neon" ? FilterUtils.neonOutlineFilter(frameToUse) : FilterUtils.xRayFilter(frameToUse))
            : frameToUse;
          image(gestureImg, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          break;
  
        case 3:
          // Blink Reaction Game: display live frame and overlay game elements
          image(frameToUse, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          if (!captured) {
            app.blinkGame.update();
          }
          app.blinkGame.render({ x: camX, y: camY, scale: EXT_VIEW_W / 320 });
          break;
  
        case 4:
          // Snapchat-Style Filters: apply snap filters (hat, glasses, mask) on detected face.
          image(frameToUse, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          push();
          translate(camX, camY);
          scale(EXT_VIEW_W / 320, EXT_VIEW_H / 240);
          if (!captured && app.faceDetections.length > 0) {
            FaceUtils.drawSnapFiltersOnCanvas(app.faceDetections[0], 0, 0, 320, 240,
              app.hatImg, app.glassesImg, app.maskImg, app.showHat, app.showGlasses, app.showMask);
          } else if (captured && storedFaceDetections.length > 0) {
            FaceUtils.drawSnapFiltersOnCanvas(storedFaceDetections[0], 0, 0, 320, 240,
              app.hatImg, app.glassesImg, app.maskImg, app.showHat, app.showGlasses, app.showMask);
          }
          pop();
          break;
  
        case 5:
          // Single-Paddle Pong game
          image(frameToUse, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          if (!captured) {
            app.pongGame.update();
          }
          app.pongGame.render({ x: camX, y: camY, scale: EXT_VIEW_W / CELL_W });
          break;
  
        case 6:
          // Hand Keypoints + Multiple Emojis: display hand tracking and emoji overlay.
          image(frameToUse, camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          rect(camX, camY, EXT_VIEW_W, EXT_VIEW_H);
          let handArr = (!captured) ? (predictions || []) : (app.storedHandPredictions || []);
          if (handArr.length > 0 && handArr[0].annotations) {
            push();
            translate(camX + 320, camY);
            scale((EXT_VIEW_W / 320) * 0.5, (EXT_VIEW_H / 240) * 0.5);
            let ann = handArr[0].annotations;
            for (let fingerName in ann) {
              for (let pt of ann[fingerName]) {
                let px = pt[0];
                let py = pt[1];
                let mx = 320 - px;
                fill(255, 0, 0);
                noStroke();
                circle(mx, py, 10);
              }
            }
            let theEmoji = (!captured) ? HandGesture.computeEmoji(ann) : storedEmoji;
            if (theEmoji !== "") {
              textSize(50);
              fill(255);
              textAlign(CENTER, CENTER);
              text(theEmoji, 0, 250);
            }
            pop();
          }
          break;
      }
  
      // ---------- Draw Extension Description ----------
      fill(200);
      textSize(14);
      textAlign(LEFT, TOP);
      noStroke();
      let desc = extensionDescriptions[app.currentExtension] || "";
      text(desc, camX, camY + EXT_VIEW_W - 150);
    }
  }
  
  // --------------------------------------------------
  //                 HandGesture Class
  // --------------------------------------------------
  // Handles detection of hand gestures using ml5's handpose model.
  class HandGesture {
    // -------- Detect Gesture --------
    // Determines which gesture is performed based on hand predictions.
    static detectGesture(handPredictions) {
      if (app.captured) {
        this.updateGestureHistory("none");
        return;
      }
      let frameGesture = "none";
      if (!handPredictions || handPredictions.length === 0) {
        this.updateGestureHistory("none");
        return;
      }
      let hand = handPredictions[0];
      let ann = hand.annotations;
      let palmCenter = this.getPalmCenter(ann);
      let thumbExt = this.fingerExtendedDistance(ann.thumb, palmCenter);
      let indexExt = this.fingerExtendedDistance(ann.indexFinger, palmCenter);
      let middleExt = this.fingerExtendedDistance(ann.middleFinger, palmCenter);
      let ringExt = this.fingerExtendedDistance(ann.ringFinger, palmCenter);
      let pinkyExt = this.fingerExtendedDistance(ann.pinky, palmCenter);
      if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) frameGesture = "neon";
      else if (thumbExt && indexExt && middleExt && ringExt && pinkyExt) frameGesture = "xray";
      this.updateGestureHistory(frameGesture);
    }
  
    // -------- Calculate Palm Center --------
    static getPalmCenter(ann) {
      let t0 = ann.thumb[0], i0 = ann.indexFinger[0], m0 = ann.middleFinger[0], r0 = ann.ringFinger[0], p0 = ann.pinky[0];
      let cx = (t0[0] + i0[0] + m0[0] + r0[0] + p0[0]) / 5;
      let cy = (t0[1] + i0[1] + m0[1] + r0[1] + p0[1]) / 5;
      return [cx, cy];
    }
  
    // -------- Determine if a Finger is Extended --------
    static fingerExtendedDistance(fingerArray, palmCenter) {
      let tip = fingerArray[fingerArray.length - 1];
      let pip = fingerArray[1];
      let tipDist = dist(tip[0], tip[1], palmCenter[0], palmCenter[1]);
      let pipDist = dist(pip[0], pip[1], palmCenter[0], palmCenter[1]);
      let EXTENDED_MARGIN = 25;
      return ((tipDist - pipDist) > EXTENDED_MARGIN);
    }
  
    // -------- Update Gesture History --------
    // Maintains a history of detected gestures to smooth out recognition.
    static updateGestureHistory(newGesture) {
      app.gestureHistory.push(newGesture);
      if (app.gestureHistory.length > app.GESTURE_QUEUE_SIZE) app.gestureHistory.shift();
      let counts = {};
      for (let g of app.gestureHistory) {
        counts[g] = (counts[g] || 0) + 1;
      }
      let bestGesture = "none", bestCount = 0;
      for (let g in counts) {
        if (counts[g] > bestCount) {
          bestCount = counts[g];
          bestGesture = g;
        }
      }
      app.currentGesture = (bestCount > app.GESTURE_QUEUE_SIZE / 2) ? bestGesture : "none";
    }
  
    // -------- Compute Emoji --------
    // Returns an emoji based on which fingers are extended.
    static computeEmoji(ann) {
      let extendedCount = 0;
      let thumbExt = this.fingerExtendedDistance(ann.thumb, this.getPalmCenter(ann));
      let indexExt = this.fingerExtendedDistance(ann.indexFinger, this.getPalmCenter(ann));
      let middleExt = this.fingerExtendedDistance(ann.middleFinger, this.getPalmCenter(ann));
      let ringExt = this.fingerExtendedDistance(ann.ringFinger, this.getPalmCenter(ann));
      let pinkyExt = this.fingerExtendedDistance(ann.pinky, this.getPalmCenter(ann));
      if (thumbExt) extendedCount++;
      if (indexExt) extendedCount++;
      if (middleExt) extendedCount++;
      if (ringExt) extendedCount++;
      if (pinkyExt) extendedCount++;
      let emoji = "";
      if (extendedCount === 5) emoji = "✋🏻";
      else if (extendedCount === 1 && thumbExt) {
        let thumbTip = ann.thumb[3], indexTip = ann.indexFinger[3];
        emoji = (thumbTip[1] < indexTip[1]) ? "👍🏻" : "👎🏻";
      } else if (extendedCount === 2 && indexExt && middleExt) emoji = "✌🏻";
      else if (extendedCount === 2 && indexExt && pinkyExt) emoji = "🤘🏻";
      return emoji;
    }
  }
  
  // --------------------------------------------------
  //                 FaceUtils Class
  // --------------------------------------------------
  // Contains utility functions for face detection and applying snap filters.
  class FaceUtils {
    // -------- Determine if a Person is Blinking --------
    static isBlinking(faceDetections) {
      if (!faceDetections || faceDetections.length === 0) return false;
      let d = faceDetections[0];
      if (!d.parts) return false;
      let leftEye = d.parts.leftEye, rightEye = d.parts.rightEye;
      if (!leftEye || !rightEye) return false;
      let leftRatio = this.eyeOpenRatio(leftEye);
      let rightRatio = this.eyeOpenRatio(rightEye);
      let threshold = 0.25;
      return (leftRatio < threshold && rightRatio < threshold);
    }
  
    // -------- Compute Eye Open Ratio --------
    static eyeOpenRatio(eyePoints) {
      let left = createVector(eyePoints[0]._x, eyePoints[0]._y);
      let right = createVector(eyePoints[3]._x, eyePoints[3]._y);
      let top1 = createVector(eyePoints[1]._x, eyePoints[1]._y);
      let top2 = createVector(eyePoints[2]._x, eyePoints[2]._y);
      let bottom1 = createVector(eyePoints[5]._x, eyePoints[5]._y);
      let bottom2 = createVector(eyePoints[4]._x, eyePoints[4]._y);
      let topAvg = p5.Vector.add(top1, top2).div(2);
      let bottomAvg = p5.Vector.add(bottom1, bottom2).div(2);
      let vertDist = p5.Vector.dist(topAvg, bottomAvg);
      let horizDist = p5.Vector.dist(left, right);
      return vertDist / horizDist;
    }
  
    // -------- Draw Snapchat-Style Filters --------
    // Overlays snap filters (hat, glasses, mask) onto the detected face.
    static drawSnapFiltersOnCanvas(detection, cellX, cellY, cellW, cellH, hatImg, glassesImg, maskImg, showHat, showGlasses, showMask) {
      let box = detection.alignedRect._box;
      let x = box._x, y = box._y, w = box._width, h = box._height;
      let mirroredX = 320 - (x + w);
      let scaleX = cellW / 320, scaleY = cellH / 240;
      let finalX = mirroredX * scaleX, finalY = y * scaleY, finalW = w * scaleX, finalH = h * scaleY;
      push();
      translate(cellX, cellY);
      imageMode(CENTER);
      if (showHat) {
        let hatW = finalW * 1.3;
        let hatH = hatW * (hatImg.height / hatImg.width);
        let hatX = finalX + finalW / 2;
        let hatY = finalY - hatH * 0.4;
        image(hatImg, hatX, hatY, hatW, hatH);
      }
      if (showGlasses) {
        let gw = finalW;
        let gh = gw * (glassesImg.height / glassesImg.width);
        let gx = finalX + finalW * 0.5;
        let gy = finalY + finalH * 0.25;
        image(glassesImg, gx, gy, gw, gh);
      }
      if (showMask) {
        let maskW = finalW * 1.4;
        let maskH = maskW * (maskImg.height / maskImg.width);
        let mx = finalX + finalW * 0.5;
        let my = finalY + finalH * 0.3;
        image(maskImg, mx, my, maskW, maskH);
      }
      pop();
    }
  }
  
  // --------------------------------------------------
  //                 BlinkGame Class
  // --------------------------------------------------
  // Implements a blink reaction game that measures the user's blink reaction time.
  class BlinkGame {
    // -------- Constructor --------
    constructor() {
      this.state = "idle";
      this.waitTime = 0;
      this.startTime = 0;
      this.reactionTime = 0;
      this.bestReaction = Infinity;
      this.reactionHistory = [];
      this.scoreUpdated = false;
    }
  
    // -------- Start Game --------
    // Initiates the blink reaction game by setting the game state and a random wait time.
    start() {
      this.state = "waiting";
      this.waitTime = int(random(20, 40));
      this.scoreUpdated = false;
    }
  
    // -------- Update Game State --------
    // Updates the state of the game based on time and blinking detection.
    update() {
      if (this.state === "waiting") {
        this.waitTime--;
        if (this.waitTime <= 0) {
          this.state = "go";
          this.startTime = millis();
        }
      } else if (this.state === "go") {
        if (FaceUtils.isBlinking(app.faceDetections)) {
          if (!this.scoreUpdated) {
            this.reactionTime = millis() - this.startTime;
            this.reactionHistory.push(this.reactionTime);
            if (this.reactionHistory.length > 5) this.reactionHistory.shift();
            if (this.reactionTime < this.bestReaction) this.bestReaction = this.reactionTime;
            this.scoreUpdated = true;
          }
          this.state = "done";
        }
      }
    }
  
    // -------- Render Game --------
    // Draws the game interface with reaction time, average, best score, and rank.
    render(ctx) {
      push();
      translate(ctx.x, ctx.y);
      scale(ctx.scale, ctx.scale);
      fill(40);
      stroke(200);
      rectMode(CENTER);
      rect(160, 120, 220, 120);
      fill(255);
      textSize(14);
      textAlign(CENTER, CENTER);
      noStroke();
      let msg = "";
      if (this.state === "idle") msg = "Blink Reaction\nPress [Space] to start";
      else if (this.state === "waiting") msg = "Wait...";
      else if (this.state === "go") msg = "BLINK NOW!";
      else if (this.state === "done") {
        let sum = this.reactionHistory.reduce((a, b) => a + b, 0);
        let avg = (this.reactionHistory.length > 0) ? sum / this.reactionHistory.length : 0;
        let rank = (this.reactionTime < 200) ? "Lightning Reflexes!" : (this.reactionTime < 300) ? "Super Fast!" : "Sleepy?";
        msg = "Reaction: " + nf(this.reactionTime, 1, 0) + " ms\nAverage: " + nf(avg, 1, 0) + " ms\nBest: " + nf(this.bestReaction, 1, 0) + " ms\nRank: " + rank + "\n\nPress [Space] to retry";
      }
      text(msg, 160, 120);
      pop();
    }
  
    // -------- Reset Game --------
    // Resets all game parameters to restart the blink reaction game.
    reset() {
      this.state = "idle";
      this.waitTime = 0;
      this.startTime = 0;
      this.reactionTime = 0;
      this.bestReaction = Infinity;
      this.reactionHistory = [];
      this.scoreUpdated = false;
    }
  }
  
  // --------------------------------------------------
  //                 PongGame Class
  // --------------------------------------------------
  // Implements a simple single-paddle pong game controlled by head movements.
  class PongGame {
    // -------- Constructor & Initialization --------
    constructor() {
      this.gameActive = false;
      this.init();
    }
  
    // -------- Initialize Game --------
    // Resets game variables including ball position, paddle position, score, and lives.
    init() {
      this.ballX = CELL_W / 2;
      this.ballY = CELL_H / 2;
      this.ballDX = 2;
      this.ballDY = -2;
      this.paddleX = (CELL_W - 40) / 2;
      this.score = 0;
      this.lives = 3;
      this.gameOver = false;
    }
  
    // -------- Update Game State --------
    // Updates the ball and paddle positions based on user movement and collision detection.
    update() {
      if (!this.gameActive) return;
      if (millis() - app.lastDetectionTime > 5000) app.resetPoseNet();
      if (!app.poses || app.poses.length === 0) return;
      let pose = app.poses[0].pose;
      let noseKey = pose.keypoints.find(k => k.part === "nose");
      if (noseKey && noseKey.score > 0.2) {
        let targetX = map(noseKey.position.x, 0, 320, 0, CELL_W - 40);
        this.paddleX = lerp(this.paddleX, targetX, 0.2);
      }
      this.ballX += this.ballDX;
      this.ballY += this.ballDY;
      if (this.ballX < 0) {
        this.ballX = 0;
        this.ballDX *= -1;
      }
      if (this.ballX > CELL_W) {
        this.ballX = CELL_W;
        this.ballDX *= -1;
      }
      if (this.ballY < 0) {
        this.ballY = 0;
        this.ballDY *= -1;
      }
      if (this.ballY > CELL_H - 10) {
        if (this.ballX >= this.paddleX && this.ballX <= this.paddleX + 40) {
          this.ballY = CELL_H - 10;
          this.ballDY *= -1;
          this.score++;
        } else {
          this.lives--;
          if (this.lives <= 0) {
            this.gameOver = true;
            this.gameActive = false;
          } else {
            this.ballX = CELL_W / 2;
            this.ballY = CELL_H / 2;
            this.ballDX = 2;
            this.ballDY = -2;
          }
        }
      }
    }
  
    // -------- Render Game --------
    // Draws the game elements: ball, paddle, and score/lives indicators.
    render(ctx) {
      push();
      translate(ctx.x, ctx.y);
      scale(ctx.scale, ctx.scale);
      if (this.gameOver) {
        fill(255, 0, 0);
        textSize(14);
        textAlign(CENTER, CENTER);
        text("GAME OVER!\nScore: " + this.score, CELL_W / 2, CELL_H / 2);
        pop();
        return;
      }
      noStroke();
      fill(0);
      ellipse(this.ballX, this.ballY, 8, 8);
      rect(this.paddleX, CELL_H - 10, 40, 10);
      fill(0);
      textSize(10);
      textAlign(LEFT, TOP);
      text("Score: " + this.score, 20, 5);
      text("Lives: " + this.lives, 100, 5);
      pop();
    }
  }
  