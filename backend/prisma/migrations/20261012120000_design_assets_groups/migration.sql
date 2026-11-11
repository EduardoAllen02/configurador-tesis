-- AlterTable
ALTER TABLE "hotspots" ADD COLUMN     "content" JSONB,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "segments" JSONB,
ADD COLUMN     "style" JSONB;

-- AlterTable
ALTER TABLE "scenes" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "imageMode" TEXT,
ADD COLUMN     "planHeading" DOUBLE PRECISION,
ADD COLUMN     "planX" DOUBLE PRECISION,
ADD COLUMN     "planY" DOUBLE PRECISION,
ADD COLUMN     "sourcePath" TEXT,
ADD COLUMN     "tiles" JSONB;

-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "design" JSONB;

-- CreateTable
CREATE TABLE "tour_assets" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "originalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_groups" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "floorplanAssetId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scene_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "scene_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_assets" ADD CONSTRAINT "tour_assets_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_groups" ADD CONSTRAINT "scene_groups_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

