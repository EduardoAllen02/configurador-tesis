const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const { uploadsDir } = require("../config/env");
const { processVideo } = require("../services/videoProcessing");
const { asyncHandler } = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const uploads = await prisma.videoUpload.findMany({
    where: { tourId: req.params.tourId },
    orderBy: { createdAt: "desc" },
  });
  res.json(uploads);
});

// Sube un video 360°, lo procesa síncronamente (FFmpeg -> frames -> Sharp -> WebP) y
// crea una Scene(origen=video_frame) por frame resultante. `frameInterval` (opcional)
// controla la reducción: 1 = todos los frames, 30 = ~1 por segundo a 30fps.
const create = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Falta el archivo video" });

  const { tourId } = req.params;
  const frameInterval = req.body.frameInterval ? Number(req.body.frameInterval) : 30;

  const videoUpload = await prisma.videoUpload.create({
    data: {
      tourId,
      originalFilename: req.file.originalname,
      storagePath: req.file.path,
      status: "extracting",
    },
  });

  const tmpRawDir = path.join(uploadsDir, "tmp", videoUpload.id);
  const webpDir = path.join(uploadsDir, "frames", videoUpload.id);

  try {
    const results = await processVideo({
      videoPath: req.file.path,
      framesDir: tmpRawDir,
      webpDir,
      frameInterval,
    });

    await prisma.videoUpload.update({ where: { id: videoUpload.id }, data: { status: "optimizing" } });

    const lastScene = await prisma.scene.findFirst({ where: { tourId }, orderBy: { orderIndex: "desc" } });
    let nextOrderIndex = (lastScene?.orderIndex ?? -1) + 1;

    const scenes = [];
    for (const [i, result] of results.entries()) {
      const filename = path.basename(result.path);
      const scene = await prisma.scene.create({
        data: {
          tourId,
          videoUploadId: videoUpload.id,
          batchId: videoUpload.id,
          origen: "video_frame",
          webpPath: `/uploads/frames/${videoUpload.id}/${filename}`,
          orderIndex: nextOrderIndex++,
        },
      });
      scenes.push(scene);
    }

    await fs.rm(tmpRawDir, { recursive: true, force: true });

    const done = await prisma.videoUpload.update({
      where: { id: videoUpload.id },
      data: { status: "done", frameCount: scenes.length },
    });

    res.status(201).json({ videoUpload: done, scenes });
  } catch (err) {
    await prisma.videoUpload.update({
      where: { id: videoUpload.id },
      data: { status: "error", errorMessage: err.message },
    });
    throw err;
  }
});

module.exports = { list, create };
