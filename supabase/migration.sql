-- CJ的漫旅 · 数据库迁移
-- 在 Supabase SQL Editor 中执行此文件

-- ============================================================
-- 1. 行程表：存储用户保存的旅行计划
-- ============================================================
CREATE TABLE IF NOT EXISTS itineraries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  destination TEXT,
  days        INT,
  budget      TEXT,
  content     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 对话历史表：存储 AI 聊天记录
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_id  UUID REFERENCES itineraries(id) ON DELETE SET NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. 收藏表：收藏目的地/路线
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('destination', 'route', 'hotel')),
  item_id     TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, type, item_id)
);

-- ============================================================
-- 4. 用户偏好表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_style  TEXT,       -- 经济/舒适/豪华
  interests     TEXT[],     -- 文化/美食/自然/购物/冒险...
  preferred_season TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. 开启行级安全 (RLS)
-- ============================================================
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. 安全策略：用户只能操作自己的数据（幂等，可重复执行）
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own itineraries') THEN
    CREATE POLICY "Own itineraries" ON itineraries
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own chat history') THEN
    CREATE POLICY "Own chat history" ON chat_history
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own favorites') THEN
    CREATE POLICY "Own favorites" ON favorites
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own preferences') THEN
    CREATE POLICY "Own preferences" ON user_preferences
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 7. 索引（幂等，重复执行不报错）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_itinerary ON chat_history(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, type);

-- ============================================================
-- 8. 自动更新 updated_at 触发器（幂等，重复执行不报错）
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS itineraries_updated_at ON itineraries;
CREATE TRIGGER itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS preferences_updated_at ON user_preferences;
CREATE TRIGGER preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
