-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('super_admin', 'admin', 'member');

-- AlterEnum
BEGIN;
CREATE TYPE "TourRole_new" AS ENUM ('cliente', 'dev');
ALTER TABLE "tour_permissions" ALTER COLUMN "role" TYPE "TourRole_new" USING ("role"::text::"TourRole_new");
ALTER TABLE "invitations" ALTER COLUMN "role" TYPE "TourRole_new" USING ("role"::text::"TourRole_new");
ALTER TYPE "TourRole" RENAME TO "TourRole_old";
ALTER TYPE "TourRole_new" RENAME TO "TourRole";
DROP TYPE "public"."TourRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "chatbotPrompt" TEXT,
ADD COLUMN     "customCss" TEXT,
ADD COLUMN     "customJs" TEXT,
ADD COLUMN     "customTexts" JSONB,
ADD COLUMN     "theme" JSONB;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isSuperAdmin",
ADD COLUMN     "globalRole" "GlobalRole" NOT NULL DEFAULT 'member';

