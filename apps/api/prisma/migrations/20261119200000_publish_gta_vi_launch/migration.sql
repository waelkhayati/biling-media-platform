-- Publish the approved launch article once. Preserve existing editorial changes.
WITH published_article AS (
  INSERT INTO "Article" (
    "id", "slug", "title", "excerpt", "author", "category", "language",
    "seoTitle", "seoDescription", "body", "tags", "featured", "status",
    "publishedAt", "firstPublishedAt", "updatedAt"
  ) VALUES (
    'cmwnyvxxh0000i4vu1cm4kpdy',
    'gta-vi-launch-vice-city',
    'GTA VI is out. Welcome back to Vice City.',
    'Rockstar returns to Vice City with two leads, a Florida-inspired state to explore, and a soundtrack built to live beyond the game.',
    'Biling Media',
    'Gaming',
    'en',
    'GTA VI is out. Welcome back to Vice City.',
    'A spoiler-free guide to the GTA VI launch: where to play, who Jason and Lucia are, and what to know about the music.',
    '[
  {
    "type": "paragraph",
    "text": "Vice City is back, and this time it''s only one stop. *Grand Theft Auto VI* launched worldwide on November 19, 2026, for **PlayStation 5** and **Xbox Series X|S**. Rockstar''s new map stretches beyond the city into Leonida, its take on Florida. [Rockstar''s launch announcement](https://www.rockstargames.com/newswire/article/39akk424a9oo53/grand-theft-auto-vi-now-available)"
  },
  {
    "type": "heading",
    "text": "Two leads, one bad score"
  },
  {
    "type": "paragraph",
    "text": "Jason and Lucia are at the center of the story. When a job falls apart, the two find themselves caught up in a conspiracy that reaches across Leonida. The setup gives the sprawl a personal stake: every attempt to find a way out depends on how much they trust each other. [Explore Rockstar''s guide to Leonida](https://www.rockstargames.com/VI)"
  },
  {
    "type": "heading",
    "text": "Watch Rockstar''s second trailer"
  },
  {
    "type": "youtube",
    "videoId": "VQRLujxTm3c"
  },
  {
    "type": "heading",
    "text": "The music goes beyond the radio dial"
  },
  {
    "type": "paragraph",
    "text": "Vice City has always had a sound. This time, the electronic duo Justice composed the original score, and Rockstar announced a separate 34-track album of original music for release around launch. There''s an easy way into Leonida even if you aren''t playing on day one: find a track you like and follow the artists behind it. [Rockstar''s launch trailer and score announcement](https://www.rockstargames.com/newswire/article/517572321a549a/watch-the-grand-theft-auto-vi-launch-trailer)"
  },
  {
    "type": "heading",
    "text": "What to know before you download"
  },
  {
    "type": "paragraph",
    "text": "The launch announcement lists PS5 and Xbox Series X|S. Rockstar has yet to give a PC release date in that announcement. If you''re downloading on console, check your free space first. Rockstar said the pre-load could require up to **212 GB**, depending on your device. [Rockstar''s pre-load guidance](https://www.rockstargames.com/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10)"
  }
]'::jsonb,
    ARRAY['gta vi', 'rockstar games', 'gaming'],
    TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("slug") DO NOTHING
  RETURNING "id", "title"
)
INSERT INTO "StudioAuditEvent" ("id", "actor", "resource", "resourceId", "title", "action", "nextStatus")
SELECT 'release-gta-vi-launch-20261119', 'Biling editorial release', 'ARTICLE',
       "id", "title", 'CREATED', 'PUBLISHED'
FROM published_article;
