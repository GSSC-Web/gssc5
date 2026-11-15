-- Optional featured image file + position on generic page_data (GSSC5-74).
ALTER TABLE "page_data" ADD COLUMN "imageFile" TEXT;
ALTER TABLE "page_data" ADD COLUMN "imagePosition" TEXT;
