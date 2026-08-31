const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

function validateByType({ type, price, targetSceneId }) {
  if (type === "price" && !price) return "price es requerido cuando type = price";
  if (type === "nav" && !targetSceneId) return "targetSceneId es requerido cuando type = nav";
  return null;
}

const list = asyncHandler(async (req, res) => {
  const hotspots = await prisma.hotspot.findMany({ where: { sceneId: req.params.sceneId } });
  res.json(hotspots);
});

const create = asyncHandler(async (req, res) => {
  const { type, lon, lat, title, description, price, targetSceneId } = req.body;
  if (!type || lon === undefined || lat === undefined || !title) {
    return res.status(400).json({ error: "type, lon, lat y title son requeridos" });
  }
  const validationError = validateByType({ type, price, targetSceneId });
  if (validationError) return res.status(400).json({ error: validationError });

  const hotspot = await prisma.hotspot.create({
    data: { sceneId: req.params.sceneId, type, lon, lat, title, description, price, targetSceneId },
  });
  res.status(201).json(hotspot);
});

const update = asyncHandler(async (req, res) => {
  const { type, lon, lat, title, description, price, targetSceneId } = req.body;
  if (type) {
    const validationError = validateByType({ type, price, targetSceneId });
    if (validationError) return res.status(400).json({ error: validationError });
  }

  const hotspot = await prisma.hotspot.update({
    where: { id: req.params.hotspotId },
    data: { type, lon, lat, title, description, price, targetSceneId },
  });
  res.json(hotspot);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.hotspot.delete({ where: { id: req.params.hotspotId } });
  res.status(204).end();
});

module.exports = { list, create, update, remove };
