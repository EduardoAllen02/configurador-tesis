const path = require("path");
const prisma = require("../config/prisma");
const { exportsDir } = require("../config/env");
const { generateBundle } = require("../services/exportBundle");
const { asyncHandler } = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const exports_ = await prisma.export.findMany({
    where: { tourId: req.params.tourId },
    orderBy: { version: "desc" },
  });
  res.json(exports_);
});

const create = asyncHandler(async (req, res) => {
  const { tourId } = req.params;
  const last = await prisma.export.findFirst({ where: { tourId }, orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1;

  const bundlePath = `/exports/${tourId}/v${version}`;
  const outDir = path.join(exportsDir, tourId, `v${version}`);

  await generateBundle({ tourId, outDir });

  const record = await prisma.export.create({
    data: { tourId, version, bundlePath, createdById: req.user.id },
  });
  res.status(201).json(record);
});

module.exports = { list, create };
