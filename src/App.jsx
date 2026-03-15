import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Hand Tattoo AR - MediaPipe Tasks Vision Implementation
 * Updated with a strict initialization lock to prevent dual-execution in React StrictMode.
 */

const tattooDesigns=[
  {
    id:1,
    ring: 7,
    finger: [1,4],
    palm: 2, 
  },
  {
    id:2,
    ring: 6,
    finger: [4,5,3],
    palm:7,
  }
];


const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTattoo, setSelectedTattoo] = useState(1);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  // Guard to prevent double initialization in StrictMode
  const isInitializing = useRef(false);

  const refImages=useMemo(()=>{
    const images={};
    Array(7).fill(0).forEach((_, id)=>{
      const img = new Image();
      img.src = `/tattoos/${id + 1}.svg`;
      images[id + 1]=img;
    });
    return images;
  },[]);


  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    // If we are already initializing or have a landmarker, skip
    if (isInitializing.current || handLandmarker) return;

    const initMediaPipe = async () => {
      try {
        isInitializing.current = true; // Set lock
        setIsLoading(true);
        
        // Dynamically import MediaPipe Tasks Vision via CDN
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0');
        const { HandLandmarker, FilesetResolver } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        const landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        setHandLandmarker(landmarker);
        await startWebcam();
        setIsLoading(false);
      } catch (err) {
        console.error("MediaPipe Init Error:", err);
        setError("AI Engine Error: Ensure your browser supports WebGL and check your internet connection.");
        setIsLoading(false);
        isInitializing.current = false; // Reset lock on error to allow retry
      }
    };

    initMediaPipe();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopWebcam();
    };
  }, []); // Empty dependency array ensures this only runs on mount

  const startWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support webcam access.");
      return;
    }

    try {
      const constraints = {
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user' 
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsWebcamRunning(true);
        };
      }
    } catch (err) {
      console.error("Webcam Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera Access Denied: Please allow camera access in browser settings.");
      } else {
        setError(`Camera Error: ${err.message}`);
      }
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Main Detection Loop
  useEffect(() => {
    if (isWebcamRunning && handLandmarker) {
      const predict = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !handLandmarker) return;

        const canvasCtx = canvas.getContext('2d');
        const startTimeMs = performance.now();

        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          try {
            const results = handLandmarker.detectForVideo(video, startTimeMs);
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (results.landmarks && results.landmarks.length > 0) {
              renderTattoos(canvasCtx, results.landmarks);
            }
            canvasCtx.restore();
          } catch (e) {
            // Silently handle transient detection errors
          }
        }

        animationRef.current = requestAnimationFrame(predict);
      };

      predict();
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [isWebcamRunning, handLandmarker, selectedTattoo]);

  const renderTattoos = (ctx, allLandmarks) => {
    allLandmarks.forEach((landmarks) => {
      const wrist = landmarks[0];
      const indexBase = landmarks[5];
      const middleBase = landmarks[9];
      const pinkyBase = landmarks[17];

      const centerX = (wrist.x + indexBase.x + middleBase.x + pinkyBase.x) / 4 * ctx.canvas.width;
      const centerY = (wrist.y + indexBase.y + middleBase.y + pinkyBase.y) / 4 * ctx.canvas.height;

      const dx = (indexBase.x - pinkyBase.x) * ctx.canvas.width;
      const dy = (indexBase.y - pinkyBase.y) * ctx.canvas.height;
      const handScale = Math.sqrt(dx * dx + dy * dy);

      const angle = Math.atan2(
        (middleBase.y - wrist.y) * ctx.canvas.height,
        (middleBase.x - wrist.x) * ctx.canvas.width
      ) + Math.PI / 2;


      const seleced=tattooDesigns.find(t=>t.id===selectedTattoo);
      const palm=seleced?.palm || 1;
      const ring=seleced?.ring || 1;
      const finger=seleced?.finger || [1,1];


      
      const ringBase = landmarks[0];
      const hand_vector={
        x: landmarks[9].x - landmarks[0].x,
        y: landmarks[9].y - landmarks[0].y
      };
      // const perpendicular_vector={
      //   x: -hand_vector.y,
      //   y: hand_vector.x
      // };
      const length = Math.sqrt(hand_vector.x ** 2 + hand_vector.y ** 2);
      // move the ring tattoo slightly towards the back of the hand
      const offset = 0.1; // Adjust this value to move the tattoo more or less
      const ring_x = ringBase.x - (hand_vector.x / length) * offset;
      const ring_y = ringBase.y - (hand_vector.y / length) * offset;
      
      drawEmoji(ctx,  ring_x * ctx.canvas.width, ring_y * ctx.canvas.height, ring, handScale*1.2, angle);


      const palm_x= - (hand_vector.x / length) * 0.05;
      const palm_y= - (hand_vector.y / length) * 0.05;

      drawEmoji(ctx, centerX + palm_x * ctx.canvas.width, centerY + palm_y * ctx.canvas.height, palm, handScale*1.1, angle);


      // const fingerTips = [4, 8, 12, 16, 20];
      const fingerTips = [3,7, 11, 15, 19];
      fingerTips.forEach((idx, i) => {
        const tip = landmarks[idx];
        const rotation = Math.atan2(
          (landmarks[idx - 2].y - tip.y) * ctx.canvas.height,
          (landmarks[idx - 2].x - tip.x) * ctx.canvas.width
        );
        drawEmoji(ctx, tip.x * ctx.canvas.width, tip.y * ctx.canvas.height, finger[0], handScale * 0.2, rotation-90 * Math.PI / 180);

      });

      const fingerCenter = [6,10,14,18];//[7,11,15,19]
      fingerCenter.forEach((idx, i) => {
        const base = landmarks[idx];
        const rotation = Math.atan2(
          (landmarks[idx - 1].y - base.y) * ctx.canvas.height,
          (landmarks[idx - 1].x - base.x) * ctx.canvas.width
        );
        drawEmoji(ctx, base.x * ctx.canvas.width, base.y * ctx.canvas.height, finger[1], handScale * 0.2, rotation-90 * Math.PI / 180);
      });

      const fingerBase=[2,5,9,13,17];//[3,6, 10,14,18];
      if(finger.length>2){
        fingerBase.forEach((idx, i) => {
          const base = landmarks[idx];
          const rotation = Math.atan2(
            (landmarks[idx - 1].y - base.y) * ctx.canvas.height,
            (landmarks[idx - 1].x - base.x) * ctx.canvas.width
          );
          drawEmoji(ctx, base.x * ctx.canvas.width, base.y * ctx.canvas.height, finger[2], handScale * 0.2, rotation-90 * Math.PI / 180);
        });
      }

      drawSkeleton(ctx, landmarks);
    });
  };

  const drawEmoji = (ctx, x, y, emoji, size, rotation) => {

    // console.log('Drawing :', emoji, 'at', x, y, 'with size', size);

    const img = refImages[emoji];
    if (img) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      // ctx.font = `${size}px serif`;
      // ctx.textAlign = 'center';
      // ctx.textBaseline = 'middle';
      // ctx.globalAlpha = 0.7;
      // ctx.shadowColor = 'rgba(0,0,0,0.5)';
      // ctx.shadowBlur = 4;
      // ctx.fillText(emoji, 0, 0);


    
      ctx.globalAlpha = 0.8;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
   


      ctx.restore();
    }else{
      console.warn(`Image for emoji ${emoji} not found.`);
    }
  };

  const drawSkeleton = (ctx, landmarks) => {
    const connections = [
      [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17, 5]
    ];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    connections.forEach(path => {
      ctx.beginPath();
      ctx.moveTo(landmarks[path[0]].x * ctx.canvas.width, landmarks[path[0]].y * ctx.canvas.height);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(landmarks[path[i]].x * ctx.canvas.width, landmarks[path[i]].y * ctx.canvas.height);
      }
      ctx.stroke();
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* <div className="max-w-4xl w-full space-y-8">         */}

        {error ? (
          <div className="bg-red-950/20 border border-red-500/50 p-10 rounded-[3rem] text-center backdrop-blur-xl">
            <p className="text-red-400 font-semibold text-lg mb-6 leading-relaxed">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 rounded-full font-bold shadow-2xl shadow-red-900/40 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <div className="relative w-full aspect-video">
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/95 backdrop-blur-2xl">
                  <div className="relative w-24 h-24 mb-8">
                    {/* <div className="absolute inset-0 border-b-4 border-l-4 border-[var(--main-color-1)] rounded-full animate-spin"></div> */}
                    <div className="absolute inset-2 border-t-4 border-r-4 border-b-4 border-[var(--main-color-2)] rounded-full animate-spin [animation-duration:1.5s]"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-white animate-pulse">initializing...</h2>
                </div>
              )}
              
              <video ref={videoRef} className="absolute top-0 w-full h-full object-cover scale-x-[-1]" muted playsInline />
              <canvas ref={canvasRef} className="absolute top-0  w-full h-full object-cover scale-x-[-1] z-10 pointer-events-none" />

              {/* <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest text-neutral-300">
                  Showing: {selectedTattoo}
                </div>
              </div> */}
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 flex justify-center">
              
              <div className="flex flex-row gap-4 items-center justify-center">
                {tattooDesigns.map(({id, palm}, index) => (
                  <button
                    key={id}
                    onClick={() => setSelectedTattoo(id)}
                    className={`group w-24 relative aspect-square flex items-center justify-center text-4xl rounded-2xl transition-all duration-500 overflow-hidden ${
                      selectedTattoo === id 
                        ? 'bg-gradient-to-br from-[var(--main-color-1)] to-[var(--main-color-2)] scale-110' 
                        : 'bg-neutral-800/50 hover:bg-neutral-800 border border-white/5'
                    }`}
                  >
                    <img src={`/tattoos/${palm}.svg`} alt={`Tattoo ${palm}`} className="w-3/4 h-3/4 object-contain" />
                    {selectedTattoo === id && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                  </button>
                ))}
              </div>
            </div>

            <footer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Tracking', value: 'High Precision', color: 'bg-emerald-500' },
                { label: 'Latency', value: 'Real-time', color: 'bg-violet-500' },
                { label: 'Runtime', value: 'WebGL GPU', color: 'bg-fuchsia-500' },
                { label: 'Status', value: 'Active', color: 'bg-rose-500' }
              ].map((stat, i) => (
                <div key={i} className="bg-neutral-200/50 border border-white/5 p-4 text-center">
                  <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`}></span>
                    <p className="text-xs font-bold text-neutral-300">{stat.value}</p>
                  </div>
                </div>
              ))}
            </footer>
          </>
        )}
      </div>
    // </div>
  );
};

export default App;