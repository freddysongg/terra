import * as THREE from "three";

const CONTOUR_WIDTH = 4096;
const CONTOUR_HEIGHT = 2048;
const CONTOUR_COLOR = "rgba(55,130,175,";

function lonLatToXY(
  lon: number,
  lat: number,
): [x: number, y: number] {
  return [
    ((lon + 180) / 360) * CONTOUR_WIDTH,
    ((90 - lat) / 180) * CONTOUR_HEIGHT,
  ];
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: readonly [number, number][],
  lineWidth: number,
  alpha: number,
): void {
  if (points.length < 2) return;
  ctx.strokeStyle = `${CONTOUR_COLOR}${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  const start = lonLatToXY(points[0]![0], points[0]![1]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 1; i < points.length; i++) {
    const prev = lonLatToXY(points[i - 1]![0], points[i - 1]![1]);
    const curr = lonLatToXY(points[i]![0], points[i]![1]);
    ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2);
  }
  const last = lonLatToXY(points[points.length - 1]![0], points[points.length - 1]![1]);
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  centerLon: number,
  centerLat: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  alpha: number,
  lineWidth: number,
): void {
  const [x, y] = lonLatToXY(centerLon, centerLat);
  ctx.strokeStyle = `${CONTOUR_COLOR}${alpha})`;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(
    x, y,
    radiusX * (CONTOUR_WIDTH / 360),
    radiusY * (CONTOUR_HEIGHT / 180),
    rotation, 0, Math.PI * 2,
  );
  ctx.stroke();
}

export function createContourTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CONTOUR_WIDTH;
  canvas.height = CONTOUR_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // north atlantic
  drawEllipse(ctx, -35, 55, 10, 5, 0.3, 0.18, 1.8);
  drawEllipse(ctx, -33, 53, 18, 9, 0.35, 0.13, 1.4);
  drawEllipse(ctx, -30, 50, 28, 14, 0.4, 0.09, 1.1);
  drawEllipse(ctx, -27, 47, 38, 19, 0.45, 0.06, 0.8);

  // south pacific
  drawCurve(ctx, [[-180,-30],[-165,-26],[-148,-28],[-130,-24],[-112,-27],[-95,-23],[-80,-26]], 2.2, 0.18);
  drawCurve(ctx, [[-178,-36],[-160,-33],[-142,-36],[-124,-32],[-106,-35],[-90,-31]], 1.8, 0.14);
  drawCurve(ctx, [[-175,-42],[-158,-39],[-140,-42],[-122,-38],[-104,-41],[-88,-37]], 1.4, 0.10);
  drawCurve(ctx, [[-172,-48],[-155,-45],[-138,-48],[-120,-44],[-102,-47]], 1.1, 0.07);

  // south atlantic spiral
  for (let ring = 0; ring < 5; ring++) {
    const r = 5 + ring * 4.5;
    const alpha = 0.18 - ring * 0.03;
    const points: [number, number][] = [];
    for (let t = 0; t <= Math.PI * 1.8; t += 0.15) {
      const w = Math.sin(t * 2.5) * 1.5;
      points.push([
        -20 + (r + w) * Math.cos(t + ring * 0.4),
        -30 + (r * 0.5 + w * 0.3) * Math.sin(t + ring * 0.4),
      ]);
    }
    drawCurve(ctx, points, 1.8 - ring * 0.18, alpha);
  }

  // southern africa
  drawCurve(ctx, [[10,-38],[20,-34],[32,-32],[44,-30],[54,-33],[62,-37],[72,-40]], 1.8, 0.16);
  drawCurve(ctx, [[8,-44],[22,-40],[36,-38],[50,-36],[60,-40],[70,-44]], 1.4, 0.12);
  drawCurve(ctx, [[12,-50],[28,-46],[44,-44],[58,-42],[68,-46]], 1.1, 0.08);

  // indian ocean
  drawCurve(ctx, [[55,-14],[68,-18],[80,-14],[92,-18],[104,-14],[116,-18]], 1.6, 0.14);
  drawCurve(ctx, [[50,-24],[68,-20],[84,-24],[100,-20],[116,-24]], 1.3, 0.10);

  // north pacific
  drawCurve(ctx, [[140,34],[158,38],[175,34],[192,38],[210,34]], 1.4, 0.12);
  drawCurve(ctx, [[145,28],[162,32],[178,28],[195,32]], 1.1, 0.08);

  // west pacific spiral
  drawEllipse(ctx, 160, 20, 10, 5, 0.3, 0.13, 1.5);
  drawEllipse(ctx, 160, 20, 16, 8, 0.35, 0.09, 1.1);

  // southern ocean
  drawCurve(ctx, [[-180,-56],[-140,-52],[-100,-56],[-60,-52],[-20,-56],[20,-52],[60,-56],[100,-52],[140,-56],[180,-52]], 2.0, 0.16);
  drawCurve(ctx, [[-180,-63],[-130,-59],[-80,-63],[-30,-59],[20,-63],[70,-59],[120,-63],[170,-59]], 1.6, 0.11);
  drawCurve(ctx, [[-180,-70],[-120,-66],[-60,-70],[0,-66],[60,-70],[120,-66],[180,-70]], 1.1, 0.07);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
