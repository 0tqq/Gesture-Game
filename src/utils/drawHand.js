// Draws the 21 hand points on the canvas that sits on top of the video.

export function drawHand(canvas, video, landmarks) {
  // Make the canvas the same pixel size as the video.
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height); // wipe the last frame

  if (!landmarks) return; // no hand visible, nothing to draw

  ctx.fillStyle = "#22d3ee";
  for (const point of landmarks) {
    // Landmarks are 0..1, so multiply by the canvas size to get pixels.
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
