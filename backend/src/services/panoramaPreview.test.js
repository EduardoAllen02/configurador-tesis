const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const sharp = require("sharp");

test("genera una WebP ligera reutilizable y limita el origen a panorámicas y cuadros", async () => {
  sharp.cache(false);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tour-preview-"));
  const previous = process.env.UPLOADS_DIR;
  process.env.UPLOADS_DIR = root;
  const { panoramaPreviewPath, ensurePanoramaPreview } = require("./panoramaPreview");
  const folder = path.join(root, "panoramas");
  const original = path.join(folder, "scene.webp");
  const result = path.join(folder, "scene.preview.webp");
  try {
    assert.equal(panoramaPreviewPath("/uploads/frames/video/0001.webp"), "/uploads/frames/video/0001.preview.webp");
    assert.equal(panoramaPreviewPath("/uploads/panoramas/rosa/Drone.webp"), "/uploads/panoramas/rosa/Drone.preview.webp");
    for (const bad of ["/uploads/assets/logo.webp", "/uploads/panoramas/../test.webp", "/uploads/panoramas/a.preview.webp", "https://example.com/pano.webp"]) {
      assert.equal(panoramaPreviewPath(bad), null);
    }
    await fs.mkdir(folder);
    await sharp({ create: { width: 2048, height: 1024, channels: 3, background: "#8f7a48" } }).webp().toFile(original);
    const source = "/uploads/panoramas/scene.webp";
    assert.deepEqual(await Promise.all([ensurePanoramaPreview(source), ensurePanoramaPreview(source)]), [result, result]);
    const { width, height, format } = await sharp(await fs.readFile(result)).metadata();
    assert.deepEqual({ width, height, format }, { width: 1024, height: 512, format: "webp" });
    assert.equal(await ensurePanoramaPreview(source), result);
    assert.deepEqual((await fs.readdir(folder)).sort(), ["scene.preview.webp", "scene.webp"]);
  } finally {
    if (previous === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = previous;
    await fs.unlink(result).catch(() => {});
    await fs.unlink(original).catch(() => {});
    await fs.rmdir(folder).catch(() => {});
    await fs.rmdir(root);
  }
});

test("genera la miniatura de la barra de escenas sin confundirla con la vista ligera", async () => {
  sharp.cache(false);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tour-thumb-"));
  const previous = process.env.UPLOADS_DIR;
  process.env.UPLOADS_DIR = root;
  for (const mod of ["./panoramaPreview", "../config/env"]) delete require.cache[require.resolve(mod)];
  const { THUMB_SUFFIX, panoramaPreviewPath, ensurePanoramaPreview } = require("./panoramaPreview");
  const folder = path.join(root, "panoramas");
  try {
    assert.equal(panoramaPreviewPath("/uploads/panoramas/a.webp", THUMB_SUFFIX), "/uploads/panoramas/a.thumb.webp");
    for (const bad of ["/uploads/panoramas/a.thumb.webp", "/uploads/panoramas/a.preview.webp"]) {
      assert.equal(panoramaPreviewPath(bad, THUMB_SUFFIX), null);
      assert.equal(panoramaPreviewPath(bad), null);
    }
    assert.equal(panoramaPreviewPath("/uploads/panoramas/a.webp", ".other.webp"), null);
    await fs.mkdir(folder);
    await sharp({ create: { width: 2048, height: 1024, channels: 3, background: "#48708f" } }).webp().toFile(path.join(folder, "scene.webp"));
    const thumb = await ensurePanoramaPreview("/uploads/panoramas/scene.webp", THUMB_SUFFIX);
    assert.equal(thumb, path.join(folder, "scene.thumb.webp"));
    const { width, height } = await sharp(await fs.readFile(thumb)).metadata();
    assert.deepEqual({ width, height }, { width: 320, height: 160 });
  } finally {
    if (previous === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = previous;
    for (const mod of ["./panoramaPreview", "../config/env"]) delete require.cache[require.resolve(mod)];
    await fs.rm(root, { recursive: true, force: true });
  }
});
