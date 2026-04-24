-- Resource seed generated from current live data (2026-04-24)
-- Run against database: uniops

USE uniops;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE resources;

INSERT INTO resources (
    id,
    name,
    type,
    location,
    capacity,
    status,
    available_from,
    available_to,
    description,
    image_url,
    created_at,
    updated_at
) VALUES
    (1, 'A401', 'LAB', 'Main Building', 60, 'AVAILABLE', '08:00:00', '17:00:00', NULL, '/uploads/resources/43205b1a-ed36-409c-9199-a56051ecffba.jpg', '2026-04-14 20:42:04.409847', '2026-04-24 11:58:22.313993'),
    (2, 'MAIN auditorium', 'AUDITORIUM', 'Auditorium', 1000, 'AVAILABLE', '08:00:00', '18:00:00', '', '/uploads/resources/0db0d8ac-88ae-466f-8e55-e92f3b37bbc6.jpg', '2026-04-14 21:28:01.653735', '2026-04-24 12:00:47.882336'),
    (3, 'F1302', 'LECTURE_HALL', 'New Building', 120, 'ACTIVE', '08:00:00', '18:00:00', 'Main lecture hall', '/uploads/resources/9ff483ae-4049-439a-a8ea-444894f03779.jpg', '2026-04-24 09:45:04.599489', '2026-04-24 12:05:12.117530'),
    (4, 'G1301', 'LAB', 'Main Building', 60, 'ACTIVE', '08:30:00', '17:30:00', 'Desktop lab for programming classes', '/uploads/resources/d03fb324-852e-4d89-86fe-7daf22689260.jpg', '2026-04-24 10:05:27.515897', '2026-04-24 12:11:33.894943'),
    (5, 'G1106', 'LECTURE_HALL', 'New Building', 120, 'ACTIVE', '08:00:00', '18:00:00', 'Tiered seating hall with smart board', '/uploads/resources/263afd85-1c80-4673-af8d-b77aa1175af9.jpg', '2026-04-24 10:06:06.368217', '2026-04-24 12:16:56.437677'),
    (6, 'Meeting Room 3', 'MEETING_ROOM', 'Library-Ground Floor', 20, 'ACTIVE', '09:00:00', '17:00:00', 'Small room for committee meetings', '/uploads/resources/499ebf9a-8afb-4176-aed1-7e0fc7c1063a.jpg', '2026-04-24 10:06:21.125197', '2026-04-24 12:31:54.097457'),
    (8, 'Projector Unit P-12', 'OTHER', 'Equipment Store - Block D', 1, 'OUT_OF_SERVICE', '08:00:00', '16:00:00', 'Portable projector currently under repair', '/uploads/resources/5e502af1-47e6-4718-b94a-bd5ae875552c.jpg', '2026-04-24 10:06:43.546358', '2026-04-24 12:36:17.042551'),
    (9, 'Sports Court Indoor 1', 'SPORTS', 'Sports Complex - Indoor Arena', 60, 'ACTIVE', '06:00:00', '22:00:00', 'Multipurpose indoor court', '/uploads/resources/b4f2abdd-c0fd-425f-94a0-d680c03caf7b.jpg', '2026-04-24 10:06:56.960799', '2026-04-24 12:35:04.680508'),
    (10, 'Study Room 2', 'STUDY_ROOM', 'Library - Floor 2', 8, 'ACTIVE', '08:00:00', '21:00:00', 'Quiet group study room', '/uploads/resources/71c97960-9719-4bd3-b509-f5641fec25af.jpg', '2026-04-24 10:07:09.428975', '2026-04-24 12:37:40.132450'),
    (11, 'F1401', 'LECTURE_HALL', 'New Building', 200, 'ACTIVE', '08:00:00', '16:30:00', 'Wet lab with safety stations', '/uploads/resources/7ae57b5a-108a-4b34-ba76-b7591ee487b0.jpg', '2026-04-24 10:07:24.656461', '2026-04-24 12:38:46.898599'),
    (12, 'Meeting Room-Main', 'MEETING_ROOM', 'Main Building', 10, 'ACTIVE', '09:00:00', '18:00:00', 'staff', '/uploads/resources/2741ceb8-dd8c-48e2-80bd-9dd31b000d58.jpg', '2026-04-24 12:29:45.984992', '2026-04-24 12:40:22.699765');

ALTER TABLE resources AUTO_INCREMENT = 13;

SET FOREIGN_KEY_CHECKS = 1;
