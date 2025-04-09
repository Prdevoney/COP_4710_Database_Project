-- Trigger to update the status of an RSO when a member is added or removed
CREATE FUNCTION update_rso_status() RETURNS TRIGGER AS $$
BEGIN 
    -- check if insert or deletion
    IF (TG_OP = 'INSERT') THEN 
        -- check if RSO now has >=5 members
        IF ((SELECT COUNT(*) FROM rso_members WHERE rso_id = NEW.rso_id) >= 5) THEN 
            -- update RSO status to active
            UPDATE rso SET status = 'active' WHERE rso_id = NEW.rso_id;
        END IF;
        RETURN NEW; 
    ELSIF (TG_OP = 'DELETE') THEN
        -- check if RSO now has <5 members
        IF ((SELECT COUNT(*) FROM rso_members WHERE rso_id = OLD.rso_id) < 5) THEN 
            -- update RSO status to inactive
            UPDATE rso SET status = 'inactive' WHERE rso_id = OLD.rso_id;
        END IF;
        RETURN OLD; 
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update RSO status when a member is added or removed
CREATE TRIGGER ros_member_added 
AFTER INSERT ON rso_members
FOR EACH ROW
EXECUTE FUNCTION update_rso_status();

CREATE TRIGGER ros_member_removed
AFTER DELETE ON rso_members
FOR EACH ROW
EXECUTE FUNCTION update_rso_status();

-- Overlapping events
CREATE FUNCTION check_event_overlap() RETURNS TRIGGER AS $$ 
BEGIN 
    -- For INSERT or UPDATE, need to check for overlaps
    IF (TG_OP = 'INSERT') THEN 
        -- Check if event overlaps with existing event
        IF EXISTS (
            SELECT 1 FROM events
            WHERE location_id = NEW.location_id 
            AND event_date = NEW.event_date
            AND (
                (NEW.start_time < end_time AND NEW.end_time > start_time)
            )
        ) THEN 
            RAISE EXCEPTION 'Event overlaps with an existing event at the same location.';
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- For updates, exclude the current event being updated in the check
        IF EXISTS (
            SELECT 1 FROM events
            WHERE location_id = NEW.location_id 
            AND event_date = NEW.event_date
            AND event_id != NEW.event_id  -- Exclude the event being updated
            AND (
                (NEW.start_time < end_time AND NEW.end_time > start_time)
            )
        ) THEN 
            RAISE EXCEPTION 'Event overlaps with an existing event at the same location.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_overlap_check 
BEFORE insert OR UPDATE ON events 
FOR EACH ROW 
EXECUTE FUNCTION check_event_overlap();

-- Trigger to make sure only an admin can create an RSO event
CREATE FUNCTION check_rso_admin() RETURNS TRIGGER AS $$
BEGIN 
    -- check if this is an RSO event
    IF NEW.event_type = 'rso' AND NEW.rso_id IS NOT NULL THEN 
        -- check if the user is an admin of the RSO
        IF NOT EXISTS (
            SELECT 1 FROM rso 
            WHERE rso_id = NEW.rso_id 
            AND admin_id = NEW.created_by
        ) THEN 
            RAISE EXCEPTION 'User is not an admin of the RSO.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_rso_admin_trigger
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION check_rso_admin();