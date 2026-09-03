const prisma = require("../config/prisma");
const { asyncHandler } = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const items = await prisma.tourMenuItem.findMany({
    where: { tourId: req.params.tourId },
    orderBy: { orderIndex: "asc" },
  });
  res.json(items);
});

const create = asyncHandler(async (req, res) => {
  const { label, targetSceneId } = req.body;
  if (!label || !targetSceneId) {
    return res.status(400).json({ error: "label y targetSceneId son requeridos" });
  }

  const last = await prisma.tourMenuItem.findFirst({
    where: { tourId: req.params.tourId },
    orderBy: { orderIndex: "desc" },
  });

  const item = await prisma.tourMenuItem.create({
    data: {
      tourId: req.params.tourId,
      label,
      targetSceneId,
      orderIndex: (last?.orderIndex ?? -1) + 1,
    },
  });
  res.status(201).json(item);
});

const update = asyncHandler(async (req, res) => {
  const { label, targetSceneId } = req.body;
  const item = await prisma.tourMenuItem.update({
    where: { id: req.params.menuItemId },
    data: { label, targetSceneId },
  });
  res.json(item);
});

const remove = asyncHandler(async (req, res) => {
  await prisma.tourMenuItem.delete({ where: { id: req.params.menuItemId } });
  res.status(204).end();
});

const reorder = asyncHandler(async (req, res) => {
  const items = req.body; // [{ id, orderIndex }]
  if (!Array.isArray(items)) return res.status(400).json({ error: "Se esperaba un arreglo" });

  await prisma.$transaction(
    items.map(({ id, orderIndex }) =>
      prisma.tourMenuItem.update({ where: { id }, data: { orderIndex } })
    )
  );
  res.status(204).end();
});

module.exports = { list, create, update, remove, reorder };
