-- Rama de la tesis: el rol dev y el codigo personalizado salen del modelo.
UPDATE "tour_permissions" SET "role" = 'cliente' WHERE "role" = 'dev';
UPDATE "invitations" SET "role" = 'cliente' WHERE "role" = 'dev';

ALTER TABLE "tours" DROP COLUMN "customCss", DROP COLUMN "customJs";

ALTER TYPE "TourRole" RENAME TO "TourRole_old";
CREATE TYPE "TourRole" AS ENUM ('cliente');
ALTER TABLE "tour_permissions" ALTER COLUMN "role" TYPE "TourRole" USING ("role"::text::"TourRole");
ALTER TABLE "invitations" ALTER COLUMN "role" TYPE "TourRole" USING ("role"::text::"TourRole");
DROP TYPE "TourRole_old";
