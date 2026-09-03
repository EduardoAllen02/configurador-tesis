-- AlterTable
ALTER TABLE "scenes" ADD COLUMN     "batchId" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tour_menu_items" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetSceneId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_menu_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tour_menu_items" ADD CONSTRAINT "tour_menu_items_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_menu_items" ADD CONSTRAINT "tour_menu_items_targetSceneId_fkey" FOREIGN KEY ("targetSceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
