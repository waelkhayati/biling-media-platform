-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" JSONB NOT NULL,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "language" TEXT NOT NULL DEFAULT 'en',
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageCaption" TEXT,
    "imageCredit" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "firstPublishedAt" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ArticleToShow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleToShow_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArticleToEpisode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleToEpisode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_id_idx" ON "Article"("status", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "Article_status_category_publishedAt_idx" ON "Article"("status", "category", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_status_featured_publishedAt_idx" ON "Article"("status", "featured", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_author_updatedAt_idx" ON "Article"("author", "updatedAt");

-- CreateIndex
CREATE INDEX "Article_tags_idx" ON "Article" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "_ArticleToShow_B_index" ON "_ArticleToShow"("B");

-- CreateIndex
CREATE INDEX "_ArticleToEpisode_B_index" ON "_ArticleToEpisode"("B");

-- AddForeignKey
ALTER TABLE "_ArticleToShow" ADD CONSTRAINT "_ArticleToShow_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToShow" ADD CONSTRAINT "_ArticleToShow_B_fkey" FOREIGN KEY ("B") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToEpisode" ADD CONSTRAINT "_ArticleToEpisode_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToEpisode" ADD CONSTRAINT "_ArticleToEpisode_B_fkey" FOREIGN KEY ("B") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

