CREATE TABLE "design_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "design" JSONB NOT NULL,
  "assets" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "design_templates_pkey" PRIMARY KEY ("id")
);
