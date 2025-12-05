/*
  # TikTok Integration Schema
  
  This migration adds tables for TikTok API integration:
  - tiktok_auth_tokens: OAuth tokens for TikTok accounts
  - tiktok_user_info: TikTok user profile and follower data
  - tiktok_videos: TikTok video metadata
  - tiktok_video_analytics: Video engagement metrics
*/

-- Create tiktok_auth_tokens table
CREATE TABLE IF NOT EXISTS tiktok_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  open_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE tiktok_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create tiktok_user_info table
CREATE TABLE IF NOT EXISTS tiktok_user_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  open_id text NOT NULL,
  union_id text,
  display_name text,
  avatar_url text,
  bio_description text,
  follower_count bigint DEFAULT 0,
  following_count bigint DEFAULT 0,
  likes_count bigint DEFAULT 0,
  video_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE tiktok_user_info ENABLE ROW LEVEL SECURITY;

-- Create tiktok_videos table
CREATE TABLE IF NOT EXISTS tiktok_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  video_id text NOT NULL UNIQUE,
  title text,
  description text,
  cover_image_url text,
  share_url text,
  embed_html text,
  embed_link text,
  duration integer DEFAULT 0,
  height integer DEFAULT 0,
  width integer DEFAULT 0,
  create_time bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tiktok_videos ENABLE ROW LEVEL SECURITY;

-- Create tiktok_video_analytics table
CREATE TABLE IF NOT EXISTS tiktok_video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES tiktok_videos(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  like_count bigint DEFAULT 0,
  comment_count bigint DEFAULT 0,
  share_count bigint DEFAULT 0,
  view_count bigint DEFAULT 0,
  engagement_rate decimal(10,2) DEFAULT 0,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(video_id)
);

ALTER TABLE tiktok_video_analytics ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tiktok_auth_account_id ON tiktok_auth_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_auth_open_id ON tiktok_auth_tokens(open_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_user_account_id ON tiktok_user_info(account_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_user_open_id ON tiktok_user_info(open_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_account_id ON tiktok_videos(account_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_video_id ON tiktok_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_create_time ON tiktok_videos(create_time);
CREATE INDEX IF NOT EXISTS idx_tiktok_analytics_video_id ON tiktok_video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_analytics_account_id ON tiktok_video_analytics(account_id);

-- RLS Policies for tiktok_auth_tokens
CREATE POLICY "Admins can read all TikTok auth tokens"
  ON tiktok_auth_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read their TikTok auth tokens"
  ON tiktok_auth_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.account_id = tiktok_auth_tokens.account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

-- RLS Policies for tiktok_user_info
CREATE POLICY "Admins can read all TikTok user info"
  ON tiktok_user_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read their TikTok user info"
  ON tiktok_user_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.account_id = tiktok_user_info.account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

-- RLS Policies for tiktok_videos
CREATE POLICY "Admins can read all TikTok videos"
  ON tiktok_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read their TikTok videos"
  ON tiktok_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.account_id = tiktok_videos.account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

-- RLS Policies for tiktok_video_analytics
CREATE POLICY "Admins can read all TikTok video analytics"
  ON tiktok_video_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read their TikTok video analytics"
  ON tiktok_video_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.account_id = tiktok_video_analytics.account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tiktok_auth_tokens_updated_at BEFORE UPDATE ON tiktok_auth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_user_info_updated_at BEFORE UPDATE ON tiktok_user_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_videos_updated_at BEFORE UPDATE ON tiktok_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_video_analytics_updated_at BEFORE UPDATE ON tiktok_video_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
