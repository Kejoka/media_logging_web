-- Notification System Database Schema
-- Run these SQL statements in your Supabase SQL Editor

-- Create user_activities table to log all media changes and follows
CREATE TABLE user_activities (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('add', 'update', 'delete', 'follow')),
  media_type text CHECK (media_type IN ('games', 'movies', 'shows', 'books')),
  media_title text,
  details jsonb, -- Store additional details like rating, notes, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at DESC);

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own activities
CREATE POLICY "Users can insert their own activities" ON user_activities
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Activities are viewable by everyone (for followers to see)
CREATE POLICY "Activities are viewable by everyone" ON user_activities
  FOR SELECT USING (true);

-- Policy: Users can delete their own activities (for cleanup when media is deleted)
CREATE POLICY "Users can delete their own activities" ON user_activities
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Create notification_read_status table to track when users last checked notifications
CREATE TABLE notification_read_status (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own read status
CREATE POLICY "Users can view their own read status" ON notification_read_status
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own read status
CREATE POLICY "Users can insert their own read status" ON notification_read_status
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own read status
CREATE POLICY "Users can update their own read status" ON notification_read_status
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Create dismissed_activities table to track per-user notification dismissals
CREATE TABLE dismissed_activities (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  activity_id bigint NOT NULL REFERENCES user_activities ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

-- Create index for faster queries
CREATE INDEX idx_dismissed_activities_user_id ON dismissed_activities(user_id);
CREATE INDEX idx_dismissed_activities_activity_id ON dismissed_activities(activity_id);

-- Enable RLS
ALTER TABLE dismissed_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own dismissed activities
CREATE POLICY "Users can view their own dismissed activities" ON dismissed_activities
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own dismissed activities
CREATE POLICY "Users can insert their own dismissed activities" ON dismissed_activities
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own dismissed activities (to undo dismissal)
CREATE POLICY "Users can delete their own dismissed activities" ON dismissed_activities
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
