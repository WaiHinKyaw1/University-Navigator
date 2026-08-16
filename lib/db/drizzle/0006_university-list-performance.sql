CREATE INDEX IF NOT EXISTS universities_name_idx ON universities (name);
CREATE INDEX IF NOT EXISTS universities_name_en_idx ON universities (name_en);
CREATE INDEX IF NOT EXISTS universities_type_idx ON universities (type);
CREATE INDEX IF NOT EXISTS universities_state_idx ON universities (state);
CREATE INDEX IF NOT EXISTS universities_min_score_idx ON universities (min_score);
CREATE INDEX IF NOT EXISTS university_majors_university_id_idx ON university_majors (university_id);
