// Seed de desarrollo: un usuario demo, un tour demo con una escena de cada origen
// (panorama_upload y video_frame) y un hotspot de navegación entre ambas.
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      email: "admin@admin.com",
      passwordHash,
      fullName: "Admin",
      isSuperAdmin: true,
    },
  });

  const tour = await prisma.tour.create({
    data: {
      title: "Tour de demostración",
      description: "Tour de prueba con una escena de panorámica y una de secuencia de video.",
      createdById: user.id,
      permissions: {
        create: { userId: user.id, role: "admin_tour" },
      },
    },
  });

  const panoramaScene = await prisma.scene.create({
    data: {
      tourId: tour.id,
      origen: "panorama_upload",
      name: "Sala principal",
      webpPath: "/uploads/panoramas/demo-panorama.webp",
      orderIndex: 0,
    },
  });

  const videoScene = await prisma.scene.create({
    data: {
      tourId: tour.id,
      origen: "video_frame",
      name: "Recorrido de entrada",
      webpPath: "/uploads/frames/demo/frame_00001.webp",
      orderIndex: 1,
    },
  });

  await prisma.hotspot.create({
    data: {
      sceneId: panoramaScene.id,
      type: "nav",
      lon: 30,
      lat: 0,
      title: "Ir al recorrido de entrada",
      targetSceneId: videoScene.id,
    },
  });

  console.log("Seed completado:", { user: user.email, tour: tour.title });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
