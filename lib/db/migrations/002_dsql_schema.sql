-- Note Card Box Database Schema for Aurora DSQL
-- Aurora DSQL does not support: foreign keys, partial indexes (WHERE clause on indexes)
-- Aurora DSQL supports: CHECK constraints, UNIQUE constraints, gen_random_uuid()

-- =============================================
-- NEXTAUTH.JS REQUIRED TABLES
-- Note: @auth/pg-adapter requires camelCase column names
-- =============================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACCOUNTS (OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    UNIQUE(provider, "providerAccountId")
);

-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
    "userId" UUID NOT NULL,
    expires TIMESTAMPTZ NOT NULL
);

-- 4. VERIFICATION TOKENS
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(identifier, token)
);

-- =============================================
-- APPLICATION TABLES
-- =============================================

-- 5. TAGS
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX ASYNC IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- 6. CARDS
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    share_id VARCHAR(10) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    type VARCHAR(20) NOT NULL DEFAULT 'INNOVATION'
        CHECK (type IN ('PERMANENT', 'INNOVATION', 'LITERATURE', 'PROJECT')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING', 'ARCHIVED')),
    is_public BOOLEAN DEFAULT FALSE,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    promoted_at TIMESTAMPTZ
);

CREATE INDEX ASYNC IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX ASYNC IF NOT EXISTS idx_cards_type ON cards(user_id, type);
CREATE INDEX ASYNC IF NOT EXISTS idx_cards_status ON cards(user_id, status);
-- Note: partial index (WHERE is_public = TRUE) not supported in Aurora DSQL; using full index instead
CREATE INDEX ASYNC IF NOT EXISTS idx_cards_share_id ON cards(share_id);
CREATE INDEX ASYNC IF NOT EXISTS idx_cards_updated_at ON cards(user_id, updated_at);

-- 7. CARD_TAGS (many-to-many junction table)
CREATE TABLE IF NOT EXISTS card_tags (
    card_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY(card_id, tag_id)
);

CREATE INDEX ASYNC IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);
CREATE INDEX ASYNC IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);

-- 8. LINKS (card-to-card relationships)
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    relation VARCHAR(20) NOT NULL DEFAULT 'EXTENSION'
        CHECK (relation IN ('EXTENSION', 'OPPOSITION')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id),
    CHECK(source_id != target_id)
);

CREATE INDEX ASYNC IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX ASYNC IF NOT EXISTS idx_links_source_id ON links(source_id);
CREATE INDEX ASYNC IF NOT EXISTS idx_links_target_id ON links(target_id);
