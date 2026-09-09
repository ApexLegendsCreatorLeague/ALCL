export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "player"
  | "team_manager"
  | "organizer"
  | "admin"
  | "moderator"
  | "scorer";
export type RecordStatus = "draft" | "published" | "archived";
export type CompetitionStatus =
  | "draft"
  | "registration"
  | "scheduled"
  | "active"
  | "complete"
  | "cancelled";
export type RegistrationStatus =
  | "pending"
  | "approved"
  | "needs_changes"
  | "rejected"
  | "withdrawn";
export type MatchStatus =
  | "scheduled"
  | "check_in"
  | "live"
  | "submitted"
  | "verified"
  | "disputed"
  | "complete"
  | "cancelled";
export type LiveApiSessionStatus =
  | "waiting"
  | "playing"
  | "resolution"
  | "postmatch"
  | "needs_mapping"
  | "ready_for_review"
  | "verified"
  | "failed";
export type AuditAction =
  | "insert"
  | "update"
  | "delete"
  | "auth"
  | "role_change"
  | "publish"
  | "verify";

type Table<Row extends object> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

type ProfilesRow = Timestamped & {
  id: string;
  display_name: string;
  username: string | null;
  country_code: string | null;
  avatar_path: string | null;
  bio: string | null;
  youtube_url: string | null;
  x_url: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  twitch_url: string | null;
  kick_url: string | null;
  looking_for_team: boolean;
  preferred_roles: string | null;
  main_legend_1: string | null;
  main_legend_2: string | null;
  main_legend_3: string | null;
  availability: string | null;
  recruitment_pitch: string | null;
  is_active: boolean;
};
type ProfileRolesRow = {
  profile_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
};
type LeaguesRow = Timestamped & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country_code: string;
  owner_id: string;
  status: RecordStatus;
};
type SeasonsRow = Timestamped & {
  id: string;
  league_id: string;
  name: string;
  slug: string;
  starts_on: string;
  ends_on: string;
  status: CompetitionStatus;
};
type TournamentsRow = Timestamped & {
  id: string;
  season_id: string;
  name: string;
  slug: string;
  format: string;
  country_code: string;
  status: CompetitionStatus;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_teams: number | null;
};
type EventsRow = Timestamped & {
  id: string;
  tournament_id: string;
  season_id: string;
  name: string;
  sequence: number;
  starts_at: string;
  ends_at: string | null;
  status: CompetitionStatus;
  published_at: string | null;
};
type TeamsRow = Timestamped & {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  captain_id: string;
  logo_path: string | null;
  is_active: boolean;
};
type PlayersRow = Timestamped & {
  id: string;
  profile_id: string;
  platform: string | null;
  country_code: string;
  rank: string | null;
  rank_captured_at: string | null;
  eligibility_verified_at: string | null;
  is_active: boolean;
};
type TeamPlayersRow = {
  team_id: string;
  player_id: string;
  is_captain: boolean;
  joined_at: string;
  left_at: string | null;
};
type RostersRow = Timestamped & {
  id: string;
  team_id: string;
  tournament_id: string;
  name: string;
  locked_at: string | null;
  submitted_by: string;
};
type RosterPlayersRow = {
  roster_id: string;
  player_id: string;
  slot: number;
  is_substitute: boolean;
  added_at: string;
};
type RegistrationsRow = Timestamped & {
  id: string;
  tournament_id: string;
  team_id: string;
  roster_id: string;
  submitted_by: string;
  status: RegistrationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};
type RegistrationSnapshotsRow = {
  id: string;
  registration_id: string;
  version: number;
  snapshot: Json;
  content_hash: string;
  created_by: string;
  created_at: string;
};
type ScoringConfigsRow = Timestamped & {
  id: string;
  tournament_id: string | null;
  event_id: string | null;
  name: string;
  placement_points: Json;
  points_per_kill: number;
  bonus_rules: Json;
  penalty_rules: Json;
  match_multipliers: Json;
  tiebreakers: Json;
  max_matches: number | null;
  is_active: boolean;
  created_by: string;
};
type MatchesRow = Timestamped & {
  id: string;
  event_id: string;
  scoring_config_id: string;
  sequence: number;
  map_name: string | null;
  lobby_code: string | null;
  starts_at: string | null;
  status: MatchStatus;
};
type MatchTeamsRow = {
  match_id: string;
  team_id: string;
  seed: number | null;
  checked_in_at: string | null;
};
type MatchPlayersRow = {
  match_id: string;
  team_id: string;
  player_id: string;
  is_substitute: boolean;
  checked_in_at: string | null;
  match_lineup_id: string | null;
  role: "active" | "substitute" | "observer";
};
type MatchResultsRow = Timestamped & {
  id: string;
  match_id: string;
  team_id: string;
  placement: number;
  kills: number;
  placement_points: number;
  kill_points: number;
  bonus_points: number;
  penalty_points: number;
  total_points: number;
  evidence_path: string | null;
  submitted_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  ingestion_source: "manual" | "liveapi" | "authorized_provider";
  source_session_id: string | null;
  review_status: "pending" | "verified" | "rejected";
};
type LiveApiSessionsRow = Timestamped & {
  id: string;
  source_key: string;
  match_id: string;
  status: LiveApiSessionStatus;
  map_name: string | null;
  collector_version: string;
  last_sequence: number;
  raw_event_count: number;
  processed_event_count: number;
  last_error: string | null;
  started_at: string;
  last_event_at: string | null;
  ended_at: string | null;
};
type LiveApiEventsRow = {
  id: string;
  session_id: string;
  sequence: number;
  event_type: string;
  occurred_at: string;
  received_at: string;
  payload: Json;
  normalized: Json;
  created_at: string;
};
type LiveApiTeamBindingsRow = Timestamped & {
  session_id: string;
  liveapi_team_key: string;
  team_id: string;
  verified_by: string | null;
  verified_at: string | null;
};
type LiveApiPlayerStatesRow = {
  session_id: string;
  player_key: string;
  liveapi_team_key: string;
  player_name: string;
  connected: boolean;
  kills: number;
  assists: number;
  damage: number;
  knocks: number;
  updated_at: string;
};
type LiveApiTeamStatesRow = {
  session_id: string;
  liveapi_team_key: string;
  team_name: string | null;
  eliminated: boolean;
  placement: number | null;
  kills: number;
  assists: number;
  damage: number;
  knocks: number;
  updated_at: string;
};
type MatchPlayerResultsRow = Timestamped & {
  match_id: string;
  team_id: string;
  player_id: string | null;
  source_player_name: string;
  kills: number;
  assists: number;
  damage: number;
  knocks: number;
  source_session_id: string;
  verified_at: string | null;
};
type EventPointsRow = {
  event_id: string;
  team_id: string;
  match_points: number;
  bonus_points: number;
  penalty_points: number;
  total_points: number;
  kills: number;
  wins: number;
  placement: number | null;
  finalized_at: string | null;
};
type SeasonStandingsRow = {
  season_id: string;
  team_id: string;
  season_points: number;
  kills: number;
  wins: number;
  events_played: number;
  rank: number | null;
  updated_at: string;
};
type ChampionshipsRow = Timestamped & {
  id: string;
  season_id: string;
  name: string;
  starts_at: string;
  ends_at: string | null;
  max_teams: number;
  status: CompetitionStatus;
};
type ChampionshipQualificationRow = {
  championship_id: string;
  team_id: string;
  season_rank: number;
  qualification_reason: string;
  qualified_at: string;
  accepted_at: string | null;
};
type CommunitySupportersRow = Timestamped & {
  id: string;
  name: string;
  category: string;
  website_url: string | null;
  logo_path: string | null;
  annual_non_cash_value_usd: number;
  starts_on: string;
  ends_on: string | null;
  approved_by: string;
};
type PrizesRow = {
  id: string;
  season_id: string | null;
  tournament_id: string | null;
  championship_id: string | null;
  team_id: string | null;
  kind: "non_cash" | "cash";
  description: string;
  cash_value_usd: number;
  fair_market_value_usd: number;
  awarded_at: string | null;
  created_by: string;
  created_at: string;
};
type NotificationsRow = {
  id: string;
  profile_id: string;
  kind: "info" | "registration" | "match" | "result" | "policy" | "security";
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};
type AnnouncementsRow = Timestamped & {
  id: string;
  league_id: string | null;
  title: string;
  body: string;
  status: RecordStatus;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
};
type RulesRow = {
  id: string;
  league_id: string | null;
  tournament_id: string | null;
  version: number;
  title: string;
  body: string;
  content_hash: string;
  status: RecordStatus;
  effective_at: string | null;
  published_at: string | null;
  created_by: string;
  created_at: string;
};
type LegalPoliciesRow = {
  id: string;
  slug: string;
  version: number;
  title: string;
  body: string;
  content_hash: string;
  is_required: boolean;
  published_at: string | null;
  effective_at: string | null;
  created_by: string;
  created_at: string;
};
type AuditLogsRow = {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  action: AuditAction;
  schema_name: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  request_id: string | null;
  ip_hash: string | null;
  metadata: Json;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfilesRow>;
      app_roles: Table<{ role: AppRole; description: string; is_privileged: boolean }>;
      profile_roles: Table<ProfileRolesRow>;
      compliance_settings: Table<{
        id: boolean;
        community_mode: boolean;
        commercial_authorization_enabled: boolean;
        cash_prize_usd: number;
        annual_prize_value_limit_usd: number;
        disabled_country_codes: string[];
        policy_reviewed_at: string;
        updated_by: string | null;
        updated_at: string;
      }>;
      prohibited_supporter_categories: Table<{
        slug: string;
        label: string;
        active: boolean;
        created_at: string;
      }>;
      leagues: Table<LeaguesRow>;
      seasons: Table<SeasonsRow>;
      tournaments: Table<TournamentsRow>;
      events: Table<EventsRow>;
      teams: Table<TeamsRow>;
      players: Table<PlayersRow>;
      team_players: Table<TeamPlayersRow>;
      rosters: Table<RostersRow>;
      roster_players: Table<RosterPlayersRow>;
      registrations: Table<RegistrationsRow>;
      registration_snapshots: Table<RegistrationSnapshotsRow>;
      scoring_configs: Table<ScoringConfigsRow>;
      matches: Table<MatchesRow>;
      match_teams: Table<MatchTeamsRow>;
      match_players: Table<MatchPlayersRow>;
      match_results: Table<MatchResultsRow>;
      match_player_results: Table<MatchPlayerResultsRow>;
      liveapi_sessions: Table<LiveApiSessionsRow>;
      liveapi_events: Table<LiveApiEventsRow>;
      liveapi_team_bindings: Table<LiveApiTeamBindingsRow>;
      liveapi_player_states: Table<LiveApiPlayerStatesRow>;
      liveapi_team_states: Table<LiveApiTeamStatesRow>;
      event_points: Table<EventPointsRow>;
      season_standings: Table<SeasonStandingsRow>;
      championships: Table<ChampionshipsRow>;
      championship_qualification: Table<ChampionshipQualificationRow>;
      community_supporters: Table<CommunitySupportersRow>;
      prizes: Table<PrizesRow>;
      notifications: Table<NotificationsRow>;
      announcements: Table<AnnouncementsRow>;
      rules: Table<RulesRow>;
      legal_policies: Table<LegalPoliciesRow>;
      policy_acceptances: Table<{
        policy_id: string;
        profile_id: string;
        accepted_at: string;
        ip_hash: string | null;
        user_agent_hash: string | null;
      }>;
      rate_limit_counters: Table<{
        scope: string;
        subject_hash: string;
        window_started_at: string;
        request_count: number;
        expires_at: string;
      }>;
      audit_logs: Table<AuditLogsRow>;
      eligibility_configs: Table<{
        id: string;
        tournament_id: string;
        version: number;
        min_age: number | null;
        allowed_country_codes: string[];
        residency_required: boolean;
        config: Json;
        created_by: string;
        created_at: string;
      }>;
      rank_snapshots: Table<{
        id: string;
        tournament_id: string;
        player_id: string | null;
        team_id: string | null;
        rank: string;
        source: string;
        captured_at: string;
        snapshot: Json;
        content_hash: string;
        created_at: string;
      }>;
      config_snapshots: Table<{
        id: string;
        tournament_id: string;
        scoring_config: Json;
        eligibility_config: Json;
        rules_config: Json;
        content_hash: string;
        captured_by: string;
        captured_at: string;
      }>;
      match_lineups: Table<{
        id: string;
        match_id: string;
        team_id: string;
        submitted_by: string;
        locked_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      moderation_asset_attestations: Table<{
        id: string;
        profile_id: string;
        team_id: string | null;
        tournament_id: string | null;
        type: "asset_rights" | "code_of_conduct" | "eligibility" | "moderation";
        asset_path: string | null;
        statement: string;
        accepted: boolean;
        metadata: Json;
        attested_at: string;
        expires_at: string | null;
      }>;
      external_data_sources: Table<{
        id: string;
        name: string;
        type: "game_api" | "rank_provider" | "broadcast" | "identity" | "other";
        base_url: string;
        public_config: Json;
        secret_reference: string | null;
        provider_key: string | null;
        authorization_reference: string | null;
        approved_by: string | null;
        approved_at: string | null;
        is_active: boolean;
        last_synced_at: string | null;
        created_by: string;
        created_at: string;
        updated_at: string;
      }>;
      registration_contacts: Table<{
        registration_id: string;
        contact_name_encrypted: string;
        contact_email_encrypted: string;
        contact_phone_encrypted: string | null;
        email_lookup_hash: string | null;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: {
      published_tournaments: Table<
        Pick<
          TournamentsRow,
          | "id"
          | "season_id"
          | "name"
          | "slug"
          | "format"
          | "country_code"
          | "status"
          | "registration_opens_at"
          | "registration_closes_at"
          | "starts_at"
          | "ends_at"
          | "max_teams"
        >
      >;
      published_rules: Table<
        Pick<
          RulesRow,
          | "id"
          | "league_id"
          | "tournament_id"
          | "version"
          | "title"
          | "body"
          | "content_hash"
          | "effective_at"
          | "published_at"
        >
      >;
      public_standings: Table<SeasonStandingsRow & {
        team_name: string;
        short_name: string;
      }>;
      public_match_results: Table<
        Pick<
          MatchResultsRow,
          "match_id" | "team_id" | "placement" | "kills" | "total_points" | "verified_at"
        > & { team_name: string }
      >;
    };
    Functions: {
      current_profile_id: { Args: Record<never, never>; Returns: string | null };
      has_role: { Args: { required_role: AppRole }; Returns: boolean };
      can_manage_competitions: { Args: Record<never, never>; Returns: boolean };
      is_team_captain: { Args: { target_team: string }; Returns: boolean };
      consume_rate_limit: {
        Args: {
          p_scope: string;
          p_subject_hash: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: { allowed: boolean; remaining: number; reset_at: string }[];
      };
    };
    Enums: {
      app_role: AppRole;
      record_status: RecordStatus;
      competition_status: CompetitionStatus;
      registration_status: RegistrationStatus;
      match_status: MatchStatus;
      liveapi_session_status: LiveApiSessionStatus;
      notification_kind: NotificationsRow["kind"];
      audit_action: AuditAction;
      prize_kind: PrizesRow["kind"];
      lineup_role: MatchPlayersRow["role"];
      attestation_type:
        | "asset_rights"
        | "code_of_conduct"
        | "eligibility"
        | "moderation";
      external_source_type:
        | "game_api"
        | "rank_provider"
        | "broadcast"
        | "identity"
        | "other";
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Tables<
  Name extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][Name]["Row"];
export type TablesInsert<
  Name extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][Name]["Insert"];
export type TablesUpdate<
  Name extends keyof Database["public"]["Tables"],
> = Database["public"]["Tables"][Name]["Update"];
